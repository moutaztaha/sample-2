import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  RefreshCw,
  Package,
  Columns
} from 'lucide-react';
import { purchaseOrderService } from '../../services/purchaseOrderService';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import CreatePOModal from './CreatePOModal';
import EditPOModal from './EditPOModal';
import ViewPOModal from './ViewPOModal';
import CreateFromRequisitionModal from './CreateFromRequisitionModal';
import ReceiveItemsModal from './ReceiveItemsModal';
import POApprovalModal from './POApprovalModal';
import { POStatsCards, POFilters } from './PurchaseOrderComponents';
import { useLocation } from 'react-router-dom';
import ColumnCustomizerModal from '../Common/ColumnCustomizer';
import { useColumnPreferences } from '../../hooks/useColumnPreferences';
import POTable from './POTable';

const DEFAULT_COLUMNS = [
  { id: 'po_number', label: 'PO Number', visible: true, width: 180, order: 1 },
  { id: 'supplier', label: 'Supplier', visible: true, width: 180, order: 2 },
  { id: 'priority', label: 'Priority', visible: true, width: 100, order: 3 },
  { id: 'status', label: 'Status', visible: true, width: 150, order: 4 },
  { id: 'items', label: 'Items', visible: true, width: 100, order: 5 },
  { id: 'total_amount', label: 'Total Amount', visible: true, width: 130, order: 6 },
  { id: 'expected_date', label: 'Expected Date', visible: true, width: 150, order: 7 },
  { id: 'created_by', label: 'Created By', visible: false, width: 150, order: 8 },
  { id: 'created_at', label: 'Created', visible: false, width: 150, order: 9 },
  { id: 'actions', label: 'Actions', visible: true, width: 150, order: 10 }
];

const PurchaseOrders: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCreateFromReqModal, setShowCreateFromReqModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [stats, setStats] = useState({
    total_pos: 0,
    draft_count: 0,
    pending_approval_count: 0,
    approved_count: 0,
    sent_count: 0,
    partially_received_count: 0,
    received_count: 0,
    cancelled_count: 0,
    total_value: 0,
    avg_order_value: 0
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
  } = useColumnPreferences('purchase_order_columns', DEFAULT_COLUMNS);

  const { socket } = useSocket();
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    loadPurchaseOrders();
    loadStats();
    
    // Check if we should open modals from navigation state
    if (location.state) {
      if (location.state.openCreateModal) {
        setShowCreateModal(true);
      }
      if (location.state.openCreateFromRequisition) {
        setShowCreateFromReqModal(true);
      }
      if (location.state.viewPurchaseOrder) {
        const poId = location.state.viewPurchaseOrder;
        handleViewById(poId);
      }
      // Clear the state to prevent reopening on page refresh
      window.history.replaceState({}, document.title);
    }
  }, [searchTerm, statusFilter, pagination.page, location.state]);

  useEffect(() => {
    if (socket && socket.connected) {
      try {
        socket.emit('join', 'po_updates');
        
        const handlePOCreated = () => {
          loadPurchaseOrders();
          loadStats();
        };
        
        const handlePOUpdated = () => {
          loadPurchaseOrders();
          loadStats();
        };

        socket.on('po_created', handlePOCreated);
        socket.on('po_updated', handlePOUpdated);

        return () => {
          socket.off('po_created', handlePOCreated);
          socket.off('po_updated', handlePOUpdated);
        };
      } catch (error) {
        console.error('Error setting up socket listeners:', error);
      }
    }
  }, [socket]);

  const loadPurchaseOrders = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit
      };

      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await purchaseOrderService.getPurchaseOrders(params);
      setPurchaseOrders(Array.isArray(response.purchaseOrders) ? response.purchaseOrders : []);
      setPagination(response.pagination || { page: 1, limit: 50, total: 0, pages: 0 });
    } catch (error) {
      console.error('Error loading purchase orders:', error);
      setPurchaseOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await purchaseOrderService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleViewById = async (id: number) => {
    try {
      const data = await purchaseOrderService.getPurchaseOrder(id);
      if (data) {
        const po = {
          id: data.id,
          po_number: data.po_number,
          title: data.title,
          description: data.description,
          supplier_id: data.supplier_id,
          supplier_name: data.supplier_name,
          supplier_contact: data.supplier_contact,
          status: data.status,
          priority: data.priority,
          order_date: data.order_date,
          expected_delivery_date: data.expected_delivery_date,
          actual_delivery_date: data.actual_delivery_date,
          total_amount: data.total_amount,
          item_count: data.items?.length || 0,
          created_by: data.created_by,
          created_by_name: data.created_by_name,
          approved_by_name: data.approved_by_name,
          created_at: data.created_at,
          updated_at: data.updated_at
        };
        setSelectedPO(po);
        setShowViewModal(true);
      }
    } catch (error) {
      console.error('Error fetching purchase order:', error);
    }
  };

  const handleView = (po: any) => {
    setSelectedPO(po);
    setShowViewModal(true);
  };

  const handleEdit = (po: any) => {
    setSelectedPO(po);
    setShowEditModal(true);
  };

  const handleQuickApproval = (po: any) => {
    setSelectedPO(po);
    setShowApprovalModal(true);
  };

  const handlePartialApproval = (po: any) => {
    setSelectedPO(po);
    setShowApprovalModal(true);
  };

  const handleReceiveItems = (po: any) => {
    setSelectedPO(po);
    setShowReceiveModal(true);
  };

  const handleDelete = async (po: any) => {
    if (confirm(`Are you sure you want to delete purchase order "${po.po_number}"?`)) {
      try {
        await purchaseOrderService.deletePurchaseOrder(po.id);
        loadPurchaseOrders();
        loadStats();
      } catch (error) {
        console.error('Error deleting purchase order:', error);
        alert('Failed to delete purchase order');
      }
    }
  };

  const handleStatusUpdate = async (po: any, newStatus: string) => {
    try {
      await purchaseOrderService.updateStatus(po.id, { status: newStatus });
      loadPurchaseOrders();
      loadStats();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleModalSuccess = () => {
    loadPurchaseOrders();
    loadStats();
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowCreateFromReqModal(false);
    setShowReceiveModal(false);
    setShowApprovalModal(false);
    setSelectedPO(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600">Manage purchase orders and supplier relationships</p>
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
            onClick={loadPurchaseOrders}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateFromReqModal(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Package className="h-4 w-4 mr-2" />
            From Requisition
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            New PO
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <POStatsCards stats={stats} />

      {/* Filters */}
      <POFilters 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <POTable
          purchaseOrders={purchaseOrders}
          loading={loading}
          pagination={pagination}
          setPagination={setPagination}
          user={user}
          onView={handleView}
          onEdit={handleEdit}
          onQuickApproval={handleQuickApproval}
          onPartialApproval={handlePartialApproval}
          onStatusUpdate={handleStatusUpdate}
          onReceiveItems={handleReceiveItems}
          onDelete={handleDelete}
          onCreateNew={() => setShowCreateModal(true)}
        />
      </div>

      {/* Modals */}
      <CreatePOModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleModalSuccess}
      />

      <EditPOModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedPO(null);
        }}
        onSuccess={handleModalSuccess}
        purchaseOrder={selectedPO}
      />

      <ViewPOModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedPO(null);
        }}
        purchaseOrder={selectedPO}
      />

      <CreateFromRequisitionModal
        isOpen={showCreateFromReqModal}
        onClose={() => setShowCreateFromReqModal(false)}
        onSuccess={handleModalSuccess}
      />

      <ReceiveItemsModal
        isOpen={showReceiveModal}
        onClose={() => {
          setShowReceiveModal(false);
          setSelectedPO(null);
        }}
        onSuccess={handleModalSuccess}
        purchaseOrder={selectedPO}
      />

      <POApprovalModal
        isOpen={showApprovalModal}
        onClose={() => {
          setShowApprovalModal(false);
          setSelectedPO(null);
        }}
        onSuccess={handleModalSuccess}
        purchaseOrder={selectedPO}
      />

      <ColumnCustomizerModal
        isOpen={showColumnCustomizer}
        onClose={() => setShowColumnCustomizer(false)}
        onSave={handleSaveColumnPreferences}
        columns={columns}
        title="Customize Purchase Order Columns"
      />
    </div>
  );
};

export default PurchaseOrders;