import React, { useState, useEffect } from 'react';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign,
  BarChart3,
  Users,
  Activity,
  Plus,
  FileText,
  UserPlus,
  ShoppingCart,
  Truck,
  ClipboardList,
  Eye,
  Settings
} from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { requisitionService } from '../../services/requisitionService';
import { purchaseOrderService } from '../../services/purchaseOrderService';
import { useSocket } from '../../contexts/SocketContext';
import { useNavigate, useLocation } from 'react-router-dom';
import ReportGeneratorModal from './ReportGeneratorModal';
import UserDashboardSettings from './UserDashboardSettings';

interface DashboardStats {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  recentActivity: number;
  pendingRequisitions: number;
  pendingPOs: number;
}

interface DashboardWidget {
  id: string;
  title: string;
  visible: boolean;
  order: number;
}

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'total_items', title: 'Total Items', visible: true, order: 1 },
  { id: 'in_stock', title: 'In Stock', visible: true, order: 2 },
  { id: 'low_stock', title: 'Low Stock', visible: true, order: 3 },
  { id: 'out_of_stock', title: 'Out of Stock', visible: true, order: 4 },
  { id: 'pending_requisitions', title: 'Pending Requisitions', visible: true, order: 5 },
  { id: 'recent_items', title: 'Recent Items', visible: true, order: 6 },
  { id: 'inventory_overview', title: 'Inventory Overview', visible: true, order: 7 },
  { id: 'quick_actions', title: 'Quick Actions', visible: true, order: 8 }
];

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    recentActivity: 0,
    pendingRequisitions: 0,
    pendingPOs: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const [recentRequisitions, setRecentRequisitions] = useState<any[]>([]);
  const [recentPOs, setRecentPOs] = useState<any[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_WIDGETS);
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadDashboardData();
    loadWidgetSettings();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('item_created', loadDashboardData);
      socket.on('item_updated', loadDashboardData);
      socket.on('item_deleted', loadDashboardData);
      socket.on('requisition_created', loadDashboardData);
      socket.on('requisition_updated', loadDashboardData);
      socket.on('po_created', loadDashboardData);
      socket.on('po_updated', loadDashboardData);

      return () => {
        socket.off('item_created');
        socket.off('item_updated');
        socket.off('item_deleted');
        socket.off('requisition_created');
        socket.off('requisition_updated');
        socket.off('po_created');
        socket.off('po_updated');
      };
    }
  }, [socket]);

  const loadWidgetSettings = () => {
    try {
      const savedWidgets = localStorage.getItem('dashboardWidgetSettings');
      if (savedWidgets) {
        setWidgets(JSON.parse(savedWidgets));
      }
    } catch (error) {
      console.error('Error loading dashboard settings:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load inventory data
      const inventoryResponse = await inventoryService.getItems({ limit: 1000 });
      const items = Array.isArray(inventoryResponse.items) ? inventoryResponse.items : [];

      const totalItems = inventoryResponse.pagination?.total || 0;
      const totalValue = items.reduce((sum: number, item: any) => sum + (item.total_value || 0), 0);
      const lowStockItems = items.filter((item: any) => item.is_low_stock).length;
      const recentActivity = items.filter((item: any) => {
        const updatedAt = new Date(item.updated_at);
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return updatedAt > dayAgo;
      }).length;

      // Get recent items
      setRecentItems(items.slice(0, 5));
      
      // Load requisition data
      const requisitionStats = await requisitionService.getStats();
      const requisitionsResponse = await requisitionService.getRequisitions({ limit: 5 });
      setRecentRequisitions(requisitionsResponse.requisitions || []);
      
      // Load purchase order data
      const poStats = await purchaseOrderService.getStats();
      const poResponse = await purchaseOrderService.getPurchaseOrders({ limit: 5 });
      setRecentPOs(poResponse.purchaseOrders || []);

      setStats({
        totalItems,
        totalValue,
        lowStockItems,
        recentActivity,
        pendingRequisitions: requisitionStats.pending_count || 0,
        pendingPOs: poStats.pending_approval_count || 0
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set safe defaults on error
      setStats({
        totalItems: 0,
        totalValue: 0,
        lowStockItems: 0,
        recentActivity: 0,
        pendingRequisitions: 0,
        pendingPOs: 0
      });
      setRecentItems([]);
      setRecentRequisitions([]);
      setRecentPOs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = () => {
    setShowReportModal(true);
  };

  // Navigate to inventory page with state to open add item modal
  const handleAddItem = () => {
    navigate('/inventory', { state: { openAddModal: true } });
  };

  // Navigate to requisitions page with state to open create requisition modal
  const handleNewRequisition = () => {
    navigate('/requisitions', { state: { openCreateModal: true } });
  };

  // Navigate to purchase orders page with state to open create PO modal
  const handleCreatePO = () => {
    navigate('/purchase-orders', { state: { openCreateModal: true } });
  };

  const navigateToInventory = () => navigate('/inventory');
  const navigateToRequisitions = () => navigate('/requisitions');
  const navigateToPurchaseOrders = () => navigate('/purchase-orders');
  const navigateToReports = () => navigate('/reports');

  const isWidgetVisible = (widgetId: string): boolean => {
    const widget = widgets.find(w => w.id === widgetId);
    return widget ? widget.visible : true;
  };

  const getWidgetOrder = (widgetId: string): number => {
    const widget = widgets.find(w => w.id === widgetId);
    return widget ? widget.order : 999;
  };

  // Sort widgets by order
  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
            title="Dashboard Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Quick Actions - Moved to the top */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button 
            onClick={handleAddItem}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group"
          >
            <Package className="h-6 w-6 text-gray-400 group-hover:text-blue-500 mr-2" />
            <span className="text-gray-600 group-hover:text-blue-600">Add New Item</span>
          </button>
          <button 
            onClick={handleNewRequisition}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors group"
          >
            <ClipboardList className="h-6 w-6 text-gray-400 group-hover:text-green-500 mr-2" />
            <span className="text-gray-600 group-hover:text-green-600">New Requisition</span>
          </button>
          <button 
            onClick={handleCreatePO}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors group"
          >
            <ShoppingCart className="h-6 w-6 text-gray-400 group-hover:text-purple-500 mr-2" />
            <span className="text-gray-600 group-hover:text-purple-600">Create PO</span>
          </button>
          <button 
            onClick={handleGenerateReport}
            className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors group"
          >
            <FileText className="h-6 w-6 text-gray-400 group-hover:text-orange-500 mr-2" />
            <span className="text-gray-600 group-hover:text-orange-600">Generate Report</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isWidgetVisible('total_items') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
                <p className="text-sm text-green-600 mt-1">+12% from last month</p>
              </div>
              <div className="bg-blue-500 p-3 rounded-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        )}

        {isWidgetVisible('in_stock') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">${stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                <p className="text-sm text-green-600 mt-1">+8% from last month</p>
              </div>
              <div className="bg-green-500 p-3 rounded-lg">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        )}

        {isWidgetVisible('low_stock') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-gray-900">{stats.lowStockItems}</p>
                <p className="text-sm text-red-600 mt-1">+5% from last month</p>
              </div>
              <div className="bg-red-500 p-3 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        )}

        {isWidgetVisible('out_of_stock') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recent Activity</p>
                <p className="text-2xl font-bold text-gray-900">{stats.recentActivity}</p>
                <p className="text-sm text-green-600 mt-1">+15% from last month</p>
              </div>
              <div className="bg-purple-500 p-3 rounded-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pending Approvals */}
      {isWidgetVisible('pending_requisitions') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Pending Requisitions</h3>
              <div className="flex items-center">
                <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {stats.pendingRequisitions} pending
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {recentRequisitions.length > 0 ? (
                recentRequisitions.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{req.title || 'Untitled'}</p>
                      <p className="text-sm text-gray-500">By: {req.requester_name}</p>
                    </div>
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        req.status === 'approved' ? 'bg-green-100 text-green-800' :
                        req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {req.status}
                      </span>
                      <button 
                        onClick={() => navigate(`/requisitions`, { state: { viewRequisition: req.id } })}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No pending requisitions</p>
              )}
            </div>
            <div className="mt-4">
              <button
                onClick={navigateToRequisitions}
                className="w-full text-center text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View All Requisitions
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Purchase Orders</h3>
              <div className="flex items-center">
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {stats.pendingPOs} pending approval
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {recentPOs.length > 0 ? (
                recentPOs.map((po: any) => (
                  <div key={po.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{po.po_number}</p>
                      <p className="text-sm text-gray-500">Supplier: {po.supplier_name}</p>
                    </div>
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        po.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        po.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                        po.status === 'approved' ? 'bg-green-100 text-green-800' :
                        po.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        po.status === 'received' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {po.status === 'pending_approval' ? 'Pending Approval' : 
                         po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                      </span>
                      <button 
                        onClick={() => navigate(`/purchase-orders`, { state: { viewPurchaseOrder: po.id } })}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No recent purchase orders</p>
              )}
            </div>
            <div className="mt-4">
              <button
                onClick={navigateToPurchaseOrders}
                className="w-full text-center text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View All Purchase Orders
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Items and Chart */}
      {(isWidgetVisible('recent_items') || isWidgetVisible('inventory_overview')) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isWidgetVisible('recent_items') && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Items</h3>
                <TrendingUp className="h-5 w-5 text-gray-400" />
              </div>
              <div className="space-y-3">
                {Array.isArray(recentItems) && recentItems.map((item: any, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.name || 'Unknown Item'}</p>
                      <p className="text-sm text-gray-500">SKU: {item.sku || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{item.quantity || 0}</p>
                      <p className="text-sm text-gray-500">{item.unit_name || 'units'}</p>
                    </div>
                  </div>
                ))}
                {(!Array.isArray(recentItems) || recentItems.length === 0) && (
                  <p className="text-gray-500 text-center py-4">No recent items</p>
                )}
              </div>
              <div className="mt-4">
                <button
                  onClick={navigateToInventory}
                  className="w-full text-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View All Inventory
                </button>
              </div>
            </div>
          )}

          {isWidgetVisible('inventory_overview') && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Inventory Overview</h3>
                <BarChart3 className="h-5 w-5 text-gray-400" />
              </div>
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="mt-1 text-sm text-gray-500">
                    Chart visualization coming soon
                  </p>
                  <button
                    onClick={navigateToReports}
                    className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View Reports & Analytics
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Report Generator Modal */}
      <ReportGeneratorModal 
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />

      {/* Dashboard Settings Modal */}
      <UserDashboardSettings
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSave={loadWidgetSettings}
      />
    </div>
  );
};

export default Dashboard;