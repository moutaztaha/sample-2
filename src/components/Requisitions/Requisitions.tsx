import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Plus, 
  RefreshCw,
  Columns
} from 'lucide-react';
import { requisitionService } from '../../services/requisitionService';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import CreateRequisitionModal from './CreateRequisitionModal';
import ViewRequisitionModal from './ViewRequisitionModal';
import EditRequisitionModal from './EditRequisitionModal';
import ApprovalModal from './ApprovalModal';
import PartialApprovalModal from './PartialApprovalModal';
import IssueItemsModal from './IssueItemsModal';
import { 
  RequisitionStats,
  RequisitionFilters,
  RequisitionPermissions
} from './RequisitionComponents';
import { useNavigate, useLocation } from 'react-router-dom';
import ColumnCustomizerModal from '../Common/ColumnCustomizer';
import { useColumnPreferences } from '../../hooks/useColumnPreferences';
import RequisitionTable from './RequisitionTable';

const DEFAULT_COLUMNS = [
  { id: 'title', label: 'Requisition', visible: true, width: 200, order: 1 },
  { id: 'requester', label: 'Requester', visible: true, width: 150, order: 2 },
  { id: 'priority', label: 'Priority', visible: true, width: 100, order: 3 },
  { id: 'status', label: 'Status', visible: true, width: 120, order: 4 },
  { id: 'items', label: 'Items', visible: true, width: 100, order: 5 },
  { id: 'cost', label: 'Est. Cost', visible: true, width: 120, order: 6 },
  { id: 'required_date', label: 'Required Date', visible: true, width: 150, order: 7 },
  { id: 'department', label: 'Department', visible: false, width: 150, order: 8 },
  { id: 'created_at', label: 'Created', visible: false, width: 150, order: 9 },
  { id: 'approver', label: 'Approver', visible: false, width: 150, order: 10 },
  { id: 'actions', label: 'Actions', visible: true, width: 150, order: 11 }
];

const Requisitions: React.FC = () => {
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showPartialApprovalModal, setShowPartialApprovalModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<any | null>(null);
  const [stats, setStats] = useState({
    total_requisitions: 0,
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    partially_approved_count: 0,
    issued_count: 0,
    partially_issued_count: 0
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
  } = useColumnPreferences('requisition_columns', DEFAULT_COLUMNS);

  const { socket } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadRequisitions();
    loadStats();
    
    // Check if we should open modals from navigation state
    if (location.state) {
      if (location.state.openCreateModal) {
        setShowCreateModal(true);
      }
      if (location.state.viewRequisition) {
        const reqId = location.state.viewRequisition;
        handleViewById(reqId);
      }
      // Clear the state to prevent reopening on page refresh
      window.history.replaceState({}, document.title);
    }
  }, [searchTerm, statusFilter, pagination.page, location.state]);

  useEffect(() => {
    if (socket && socket.connected) {
      try {
        socket.emit('join', 'requisition_updates');
        
        const handleRequisitionCreated = () => {
          loadRequisitions();
          loadStats();
        };
        
        const handleRequisitionUpdated = () => {
          loadRequisitions();
          loadStats();
        };
        
        const handleRequisitionDeleted = () => {
          loadRequisitions();
          loadStats();
        };

        socket.on('requisition_created', handleRequisitionCreated);
        socket.on('requisition_updated', handleRequisitionUpdated);
        socket.on('requisition_deleted', handleRequisitionDeleted);

        return () => {
          socket.off('requisition_created', handleRequisitionCreated);
          socket.off('requisition_updated', handleRequisitionUpdated);
          socket.off('requisition_deleted', handleRequisitionDeleted);
        };
      } catch (error) {
        console.error('Error setting up socket listeners:', error);
      }
    }
  }, [socket]);

  const loadRequisitions = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit
      };

      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await requisitionService.getRequisitions(params);
      setRequisitions(Array.isArray(response.requisitions) ? response.requisitions : []);
      setPagination(response.pagination || { page: 1, limit: 50, total: 0, pages: 0 });
    } catch (error) {
      console.error('Error loading requisitions:', error);
      setRequisitions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await requisitionService.getStats();
      setStats(statsData || {
        total_requisitions: 0,
        pending_count: 0,
        approved_count: 0,
        rejected_count: 0,
        partially_approved_count: 0,
        issued_count: 0,
        partially_issued_count: 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({
        total_requisitions: 0,
        pending_count: 0,
        approved_count: 0,
        rejected_count: 0,
        partially_approved_count: 0,
        issued_count: 0,
        partially_issued_count: 0
      });
    }
  };

  const handleViewById = async (id: number) => {
    try {
      const data = await requisitionService.getRequisition(id);
      if (data) {
        setSelectedRequisition(data);
        setShowViewModal(true);
      }
    } catch (error) {
      console.error('Error fetching requisition:', error);
    }
  };

  const handleView = (requisition: any) => {
    setSelectedRequisition(requisition);
    setShowViewModal(true);
  };

  const handleEdit = (requisition: any) => {
    setSelectedRequisition(requisition);
    setShowEditModal(true);
  };

  const handleQuickApproval = (requisition: any) => {
    setSelectedRequisition(requisition);
    setShowApprovalModal(true);
  };

  const handlePartialApproval = (requisition: any) => {
    setSelectedRequisition(requisition);
    setShowPartialApprovalModal(true);
  };

  const handleIssueItems = (requisition: any) => {
    setSelectedRequisition(requisition);
    setShowIssueModal(true);
  };

  const handleCreatePO = (requisition: any) => {
    // Navigate to purchase orders page with state to open the create from requisition modal
    navigate('/purchase-orders', { 
      state: { 
        openCreateFromRequisition: true,
        requisitionId: requisition.id 
      }
    });
  };

  const handleDelete = async (requisition: any) => {
    const statusText = requisition.status === 'issued' ? 'issued' : 
                      requisition.status === 'partially_issued' ? 'partially issued' : 
                      requisition.status;
    
    if (confirm(`Are you sure you want to delete this ${statusText} requisition "${requisition.title}"?\n\nNote: This will permanently remove the requisition but will NOT reverse any inventory changes that were made during item issuance.`)) {
      try {
        await requisitionService.deleteRequisition(requisition.id);
        loadRequisitions();
        loadStats();
      } catch (error) {
        console.error('Error deleting requisition:', error);
        alert('Failed to delete requisition');
      }
    }
  };

  const handleModalSuccess = () => {
    loadRequisitions();
    loadStats();
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowApprovalModal(false);
    setShowPartialApprovalModal(false);
    setShowIssueModal(false);
    setSelectedRequisition(null);
  };

  // Add the ability to create a purchase order from an approved requisition
  const canCreatePO = (requisition: any) => {
    return (requisition.status === 'approved' || requisition.status === 'partially_approved') &&
           (user?.role === 'admin' || user?.role === 'manager');
  };

  // Extend the RequisitionTable component to include the PO button
  const extendedTableProps = {
    requisitions,
    loading,
    pagination,
    setPagination,
    user,
    searchTerm,
    statusFilter,
    onView: handleView,
    onEdit: handleEdit,
    onQuickApproval: handleQuickApproval,
    onPartialApproval: handlePartialApproval,
    onIssueItems: handleIssueItems,
    onDelete: handleDelete,
    onCreateNew: () => setShowCreateModal(true),
    onCreatePO: handleCreatePO,
    canCreatePO
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Requisitions</h1>
          <p className="text-gray-600">Manage inventory requisitions and approvals</p>
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
            onClick={loadRequisitions}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Requisition
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <RequisitionStats stats={stats} />

      {/* Filters */}
      <RequisitionFilters 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {/* Requisitions Table - Using extended props */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <RequisitionTable {...extendedTableProps} />
      </div>

      {/* User Role Info */}
      <RequisitionPermissions user={user} />

      {/* Modals */}
      <CreateRequisitionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleModalSuccess}
      />

      <ViewRequisitionModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedRequisition(null);
        }}
        requisition={selectedRequisition}
      />

      <EditRequisitionModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedRequisition(null);
        }}
        onSuccess={handleModalSuccess}
        requisition={selectedRequisition}
      />

      <ApprovalModal
        isOpen={showApprovalModal}
        onClose={() => {
          setShowApprovalModal(false);
          setSelectedRequisition(null);
        }}
        onSuccess={handleModalSuccess}
        requisition={selectedRequisition}
      />

      <PartialApprovalModal
        isOpen={showPartialApprovalModal}
        onClose={() => {
          setShowPartialApprovalModal(false);
          setSelectedRequisition(null);
        }}
        onSuccess={handleModalSuccess}
        requisition={selectedRequisition}
      />

      <IssueItemsModal
        isOpen={showIssueModal}
        onClose={() => {
          setShowIssueModal(false);
          setSelectedRequisition(null);
        }}
        onSuccess={handleModalSuccess}
        requisition={selectedRequisition}
      />

      <ColumnCustomizerModal
        isOpen={showColumnCustomizer}
        onClose={() => setShowColumnCustomizer(false)}
        onSave={handleSaveColumnPreferences}
        columns={columns}
        title="Customize Requisition Columns"
      />
    </div>
  );
};

export default Requisitions;