import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  RefreshCw, 
  BarChart2, 
  PieChart, 
  TrendingUp,
  Columns,
  Filter,
  Download,
  Trash2,
  Edit,
  Eye
} from 'lucide-react';
import ReportBuilder from './ReportBuilder';
import { inventoryService } from '../../services/inventoryService';
import { requisitionService } from '../../services/requisitionService';
import { purchaseOrderService } from '../../services/purchaseOrderService';
import { productionOrderService } from '../../services/productionService';

interface ReportDashboardProps {}

interface SavedReport {
  id: string;
  title: string;
  description: string;
  type: string;
  chartType: string;
  lastRun?: string;
  createdAt: string;
}

interface DashboardWidget {
  id: string;
  title: string;
  type: 'inventory_value' | 'low_stock' | 'pending_requisitions' | 'open_pos' | 'production_status' | 'recent_movements';
  size: 'small' | 'medium' | 'large';
  position: number;
}

const ReportDashboard: React.FC<ReportDashboardProps> = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'builder'>('dashboard');
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    pendingRequisitions: 0,
    openPurchaseOrders: 0,
    activeProductions: 0
  });

  useEffect(() => {
    loadSavedReports();
    loadWidgets();
    loadStats();
  }, []);

  const loadSavedReports = () => {
    const savedReportsJson = localStorage.getItem('savedReports');
    if (savedReportsJson) {
      try {
        const parsed = JSON.parse(savedReportsJson);
        if (Array.isArray(parsed)) {
          // Convert to SavedReport format with IDs
          const reports: SavedReport[] = parsed.map((report, index) => ({
            id: `report-${index}`,
            title: report.title,
            description: report.description || '',
            type: report.type,
            chartType: report.chartType,
            lastRun: new Date().toISOString(),
            createdAt: new Date().toISOString()
          }));
          setSavedReports(reports);
        }
      } catch (e) {
        console.error('Error loading saved reports:', e);
      }
    }
  };

  const loadWidgets = () => {
    const widgetsJson = localStorage.getItem('dashboardWidgets');
    if (widgetsJson) {
      try {
        const parsed = JSON.parse(widgetsJson);
        if (Array.isArray(parsed)) {
          setWidgets(parsed);
        }
      } catch (e) {
        console.error('Error loading widgets:', e);
      }
    } else {
      // Set default widgets if none exist
      const defaultWidgets: DashboardWidget[] = [
        { id: 'widget-1', title: 'Inventory Value', type: 'inventory_value', size: 'medium', position: 0 },
        { id: 'widget-2', title: 'Low Stock Items', type: 'low_stock', size: 'medium', position: 1 },
        { id: 'widget-3', title: 'Pending Requisitions', type: 'pending_requisitions', size: 'medium', position: 2 },
        { id: 'widget-4', title: 'Open Purchase Orders', type: 'open_pos', size: 'medium', position: 3 },
        { id: 'widget-5', title: 'Production Status', type: 'production_status', size: 'large', position: 4 },
        { id: 'widget-6', title: 'Recent Stock Movements', type: 'recent_movements', size: 'large', position: 5 }
      ];
      setWidgets(defaultWidgets);
      localStorage.setItem('dashboardWidgets', JSON.stringify(defaultWidgets));
    }
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      // Load inventory stats
      const inventoryResponse = await inventoryService.getItems({ limit: 1000 });
      const items = inventoryResponse.items || [];
      const totalValue = items.reduce((sum, item) => sum + (item.total_value || 0), 0);
      const lowStockItems = items.filter(item => item.is_low_stock).length;

      // Load requisition stats
      const reqStats = await requisitionService.getStats();
      const pendingRequisitions = reqStats.pending_count || 0;

      // Load PO stats
      const poStats = await purchaseOrderService.getStats();
      const openPurchaseOrders = (poStats.pending_approval_count || 0) + (poStats.approved_count || 0) + (poStats.sent_count || 0);

      // Load production stats
      const prodStats = await productionOrderService.getStats();
      const activeProductions = (prodStats.planned_count || 0) + (prodStats.in_progress_count || 0);

      setStats({
        totalItems: items.length,
        totalValue,
        lowStockItems,
        pendingRequisitions,
        openPurchaseOrders,
        activeProductions
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const addWidget = (type: DashboardWidget['type']) => {
    const newWidget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      title: getWidgetTitle(type),
      type,
      size: 'medium',
      position: widgets.length
    };
    
    const updatedWidgets = [...widgets, newWidget];
    setWidgets(updatedWidgets);
    localStorage.setItem('dashboardWidgets', JSON.stringify(updatedWidgets));
  };

  const removeWidget = (id: string) => {
    const updatedWidgets = widgets.filter(widget => widget.id !== id);
    setWidgets(updatedWidgets);
    localStorage.setItem('dashboardWidgets', JSON.stringify(updatedWidgets));
  };

  const getWidgetTitle = (type: DashboardWidget['type']): string => {
    switch (type) {
      case 'inventory_value': return 'Inventory Value';
      case 'low_stock': return 'Low Stock Items';
      case 'pending_requisitions': return 'Pending Requisitions';
      case 'open_pos': return 'Open Purchase Orders';
      case 'production_status': return 'Production Status';
      case 'recent_movements': return 'Recent Stock Movements';
      default: return 'New Widget';
    }
  };

  const renderWidget = (widget: DashboardWidget) => {
    switch (widget.type) {
      case 'inventory_value':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{widget.title}</h3>
              <button
                onClick={() => removeWidget(widget.id)}
                className="text-gray-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center">
              <DollarSign className="h-12 w-12 text-green-500 mr-4" />
              <div>
                <p className="text-3xl font-bold text-gray-900">${stats.totalValue.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Total inventory value</p>
              </div>
            </div>
          </div>
        );
      
      case 'low_stock':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{widget.title}</h3>
              <button
                onClick={() => removeWidget(widget.id)}
                className="text-gray-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mr-4" />
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats.lowStockItems}</p>
                <p className="text-sm text-gray-600">Items below minimum stock level</p>
              </div>
            </div>
          </div>
        );
      
      case 'pending_requisitions':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{widget.title}</h3>
              <button
                onClick={() => removeWidget(widget.id)}
                className="text-gray-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center">
              <ClipboardList className="h-12 w-12 text-blue-500 mr-4" />
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats.pendingRequisitions}</p>
                <p className="text-sm text-gray-600">Pending approval</p>
              </div>
            </div>
          </div>
        );
      
      case 'open_pos':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{widget.title}</h3>
              <button
                onClick={() => removeWidget(widget.id)}
                className="text-gray-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center">
              <ShoppingCart className="h-12 w-12 text-purple-500 mr-4" />
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats.openPurchaseOrders}</p>
                <p className="text-sm text-gray-600">Open purchase orders</p>
              </div>
            </div>
          </div>
        );
      
      case 'production_status':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{widget.title}</h3>
              <button
                onClick={() => removeWidget(widget.id)}
                className="text-gray-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center">
              <Factory className="h-12 w-12 text-indigo-500 mr-4" />
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats.activeProductions}</p>
                <p className="text-sm text-gray-600">Active production orders</p>
              </div>
            </div>
          </div>
        );
      
      case 'recent_movements':
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{widget.title}</h3>
              <button
                onClick={() => removeWidget(widget.id)}
                className="text-gray-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-center h-40">
              <TrendingUp className="h-12 w-12 text-gray-300" />
              <p className="ml-2 text-gray-500">Stock movement chart coming soon</p>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{widget.title}</h3>
              <button
                onClick={() => removeWidget(widget.id)}
                className="text-gray-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-center h-40">
              <p className="text-gray-500">Widget content</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Generate reports and analyze your data</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadStats}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => setActiveTab('builder')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
            >
              <BarChart2 className="h-5 w-5 mr-2" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
            >
              <FileText className="h-5 w-5 mr-2" />
              Saved Reports
            </button>
            <button
              onClick={() => setActiveTab('builder')}
              className={`${
                activeTab === 'builder'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
            >
              <Plus className="h-5 w-5 mr-2" />
              Report Builder
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Widget Controls */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Analytics Dashboard</h2>
                <div className="flex space-x-2">
                  <div className="relative">
                    <button
                      className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Widget
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden">
                      <button
                        onClick={() => addWidget('inventory_value')}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        Inventory Value
                      </button>
                      <button
                        onClick={() => addWidget('low_stock')}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        Low Stock Items
                      </button>
                      <button
                        onClick={() => addWidget('pending_requisitions')}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        Pending Requisitions
                      </button>
                      <button
                        onClick={() => addWidget('open_pos')}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        Open Purchase Orders
                      </button>
                      <button
                        onClick={() => addWidget('production_status')}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        Production Status
                      </button>
                      <button
                        onClick={() => addWidget('recent_movements')}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        Recent Stock Movements
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={loadStats}
                    className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </button>
                </div>
              </div>

              {/* Widgets Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {widgets.map(widget => (
                  <div 
                    key={widget.id} 
                    className={`${
                      widget.size === 'large' ? 'lg:col-span-2' : 
                      widget.size === 'small' ? 'lg:col-span-1' : 'lg:col-span-1'
                    }`}
                  >
                    {renderWidget(widget)}
                  </div>
                ))}

                {/* Add Widget Button */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-500 cursor-pointer transition-colors">
                  <Plus className="h-8 w-8 mb-2" />
                  <p className="text-sm font-medium">Add Widget</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Saved Reports</h2>
                <button
                  onClick={() => setActiveTab('builder')}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Report
                </button>
              </div>

              {savedReports.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No saved reports</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating your first report.
                  </p>
                  <button
                    onClick={() => setActiveTab('builder')}
                    className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Report
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedReports.map(report => (
                    <div key={report.id} className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">{report.title}</h3>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => {/* View report */}}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Report"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {/* Edit report */}}
                            className="p-1 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Edit Report"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {/* Delete report */}}
                            className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Report"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{report.description}</p>
                      <div className="flex items-center text-sm text-gray-500">
                        <div className="flex items-center mr-4">
                          {report.chartType === 'bar' && <BarChart2 className="h-4 w-4 mr-1" />}
                          {report.chartType === 'pie' && <PieChart className="h-4 w-4 mr-1" />}
                          {report.chartType === 'line' && <TrendingUp className="h-4 w-4 mr-1" />}
                          {report.chartType === 'table' && <FileText className="h-4 w-4 mr-1" />}
                          <span className="capitalize">{report.chartType}</span>
                        </div>
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-1" />
                          <span className="capitalize">{report.type}</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
                        <span className="text-xs text-gray-500">
                          Created: {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                        {report.lastRun && (
                          <span className="text-xs text-gray-500">
                            Last run: {new Date(report.lastRun).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'builder' && (
            <ReportBuilder onClose={() => setActiveTab('reports')} />
          )}
        </div>
      </div>
    </div>
  );
};

// Icons for the widgets
const DollarSign = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <line x1="12" y1="1" x2="12" y2="23"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
);

const AlertTriangle = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const ClipboardList = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    <line x1="9" y1="12" x2="15" y2="12"></line>
    <line x1="9" y1="16" x2="15" y2="16"></line>
    <line x1="9" y1="8" x2="11" y2="8"></line>
  </svg>
);

const ShoppingCart = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21" r="1"></circle>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
  </svg>
);

const Factory = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path>
    <path d="M17 18h1"></path>
    <path d="M12 18h1"></path>
    <path d="M7 18h1"></path>
  </svg>
);

export default ReportDashboard;