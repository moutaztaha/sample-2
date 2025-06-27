import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  BarChart2, 
  PieChart, 
  TrendingUp, 
  Calendar, 
  Download, 
  Save,
  Plus,
  Trash2,
  Filter,
  RefreshCw,
  X
} from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { requisitionService } from '../../services/requisitionService';
import { purchaseOrderService } from '../../services/purchaseOrderService';
import { productionOrderService } from '../../services/productionService';

interface ReportBuilderProps {
  onClose?: () => void;
}

type ReportType = 'inventory' | 'requisitions' | 'purchase_orders' | 'production' | 'stock_movements';
type ChartType = 'table' | 'bar' | 'pie' | 'line';
type DateRange = 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface ReportConfig {
  title: string;
  description: string;
  type: ReportType;
  chartType: ChartType;
  dateRange: DateRange;
  customStartDate?: string;
  customEndDate?: string;
  filters: {
    field: string;
    operator: string;
    value: string;
  }[];
  columns: string[];
  groupBy?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

const ReportBuilder: React.FC<ReportBuilderProps> = ({ onClose }) => {
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    title: 'New Report',
    description: '',
    type: 'inventory',
    chartType: 'table',
    dateRange: 'month',
    filters: [],
    columns: [],
  });
  
  const [availableColumns, setAvailableColumns] = useState<{id: string, label: string}[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedReports, setSavedReports] = useState<ReportConfig[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Load available columns based on report type
  useEffect(() => {
    loadAvailableColumns(reportConfig.type);
  }, [reportConfig.type]);

  // Load saved reports from localStorage
  useEffect(() => {
    const savedReportsJson = localStorage.getItem('savedReports');
    if (savedReportsJson) {
      try {
        const parsed = JSON.parse(savedReportsJson);
        if (Array.isArray(parsed)) {
          setSavedReports(parsed);
        }
      } catch (e) {
        console.error('Error loading saved reports:', e);
      }
    }
  }, []);

  const loadAvailableColumns = (reportType: ReportType) => {
    switch (reportType) {
      case 'inventory':
        setAvailableColumns([
          { id: 'name', label: 'Item Name' },
          { id: 'sku', label: 'SKU' },
          { id: 'category_name', label: 'Category' },
          { id: 'quantity', label: 'Quantity' },
          { id: 'unit_price', label: 'Unit Price' },
          { id: 'total_value', label: 'Total Value' },
          { id: 'location_name', label: 'Location' },
          { id: 'supplier_name', label: 'Supplier' },
          { id: 'min_quantity', label: 'Min Quantity' },
          { id: 'max_quantity', label: 'Max Quantity' },
          { id: 'item_type', label: 'Item Type' },
          { id: 'is_low_stock', label: 'Low Stock Status' },
        ]);
        break;
      case 'requisitions':
        setAvailableColumns([
          { id: 'title', label: 'Title' },
          { id: 'requester_name', label: 'Requester' },
          { id: 'department', label: 'Department' },
          { id: 'status', label: 'Status' },
          { id: 'priority', label: 'Priority' },
          { id: 'total_estimated_cost', label: 'Total Cost' },
          { id: 'required_date', label: 'Required Date' },
          { id: 'created_at', label: 'Created Date' },
          { id: 'item_count', label: 'Item Count' },
        ]);
        break;
      case 'purchase_orders':
        setAvailableColumns([
          { id: 'po_number', label: 'PO Number' },
          { id: 'title', label: 'Title' },
          { id: 'supplier_name', label: 'Supplier' },
          { id: 'status', label: 'Status' },
          { id: 'priority', label: 'Priority' },
          { id: 'total_amount', label: 'Total Amount' },
          { id: 'order_date', label: 'Order Date' },
          { id: 'expected_delivery_date', label: 'Expected Delivery' },
          { id: 'created_by_name', label: 'Created By' },
        ]);
        break;
      case 'production':
        setAvailableColumns([
          { id: 'order_number', label: 'Order Number' },
          { id: 'title', label: 'Title' },
          { id: 'status', label: 'Status' },
          { id: 'priority', label: 'Priority' },
          { id: 'quantity', label: 'Quantity' },
          { id: 'planned_cost', label: 'Planned Cost' },
          { id: 'actual_cost', label: 'Actual Cost' },
          { id: 'start_date', label: 'Start Date' },
          { id: 'due_date', label: 'Due Date' },
          { id: 'completion_date', label: 'Completion Date' },
          { id: 'created_by_name', label: 'Created By' },
        ]);
        break;
      case 'stock_movements':
        setAvailableColumns([
          { id: 'item_name', label: 'Item Name' },
          { id: 'movement_type', label: 'Movement Type' },
          { id: 'quantity', label: 'Quantity' },
          { id: 'reference_type', label: 'Reference Type' },
          { id: 'reference_number', label: 'Reference Number' },
          { id: 'created_by', label: 'Created By' },
          { id: 'created_at', label: 'Date' },
          { id: 'notes', label: 'Notes' },
        ]);
        break;
    }

    // Reset selected columns when report type changes
    setReportConfig(prev => ({
      ...prev,
      columns: []
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setReportConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleColumnToggle = (columnId: string) => {
    setReportConfig(prev => {
      const columns = [...prev.columns];
      if (columns.includes(columnId)) {
        return { ...prev, columns: columns.filter(id => id !== columnId) };
      } else {
        return { ...prev, columns: [...columns, columnId] };
      }
    });
  };

  const handleAddFilter = () => {
    setReportConfig(prev => ({
      ...prev,
      filters: [...prev.filters, { field: '', operator: 'equals', value: '' }]
    }));
  };

  const handleRemoveFilter = (index: number) => {
    setReportConfig(prev => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index)
    }));
  };

  const handleFilterChange = (index: number, field: string, value: string) => {
    setReportConfig(prev => {
      const filters = [...prev.filters];
      filters[index] = { ...filters[index], [field]: value };
      return { ...prev, filters };
    });
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    setReportConfig(prev => ({
      ...prev,
      dateRange: value as DateRange,
      // Reset custom dates if not using custom range
      ...(value !== 'custom' && { customStartDate: undefined, customEndDate: undefined })
    }));
  };

  const generateReport = async () => {
    if (reportConfig.columns.length === 0) {
      setError('Please select at least one column for the report');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let data: any[] = [];
      
      // Prepare date filters
      const dateFilters: any = {};
      if (reportConfig.dateRange !== 'all') {
        const now = new Date();
        let startDate = new Date();
        
        switch (reportConfig.dateRange) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          case 'quarter':
            startDate = new Date(now.setMonth(now.getMonth() - 3));
            break;
          case 'year':
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
          case 'custom':
            if (reportConfig.customStartDate) {
              startDate = new Date(reportConfig.customStartDate);
            }
            break;
        }
        
        dateFilters.startDate = startDate.toISOString().split('T')[0];
        
        if (reportConfig.dateRange === 'custom' && reportConfig.customEndDate) {
          dateFilters.endDate = reportConfig.customEndDate;
        }
      }

      // Fetch data based on report type
      switch (reportConfig.type) {
        case 'inventory':
          const inventoryResponse = await inventoryService.getItems({ limit: 1000 });
          data = inventoryResponse.items || [];
          break;
        case 'requisitions':
          const requisitionsResponse = await requisitionService.getRequisitions({ limit: 1000 });
          data = requisitionsResponse.requisitions || [];
          break;
        case 'purchase_orders':
          const poResponse = await purchaseOrderService.getPurchaseOrders({ limit: 1000 });
          data = poResponse.purchaseOrders || [];
          break;
        case 'production':
          const productionResponse = await productionOrderService.getProductionOrders({ limit: 1000 });
          data = productionResponse.productionOrders || [];
          break;
        case 'stock_movements':
          const movementsResponse = await inventoryService.getStockMovements({
            ...dateFilters,
            limit: 1000
          });
          data = movementsResponse.movements || [];
          break;
      }

      // Apply filters
      if (reportConfig.filters.length > 0) {
        data = data.filter(item => {
          return reportConfig.filters.every(filter => {
            if (!filter.field || !filter.operator || filter.value === undefined) return true;
            
            const itemValue = item[filter.field];
            const filterValue = filter.value;
            
            switch (filter.operator) {
              case 'equals':
                return itemValue === filterValue;
              case 'contains':
                return String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase());
              case 'greater_than':
                return Number(itemValue) > Number(filterValue);
              case 'less_than':
                return Number(itemValue) < Number(filterValue);
              default:
                return true;
            }
          });
        });
      }

      // Apply sorting
      if (reportConfig.sortBy) {
        data.sort((a, b) => {
          const aValue = a[reportConfig.sortBy!];
          const bValue = b[reportConfig.sortBy!];
          
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return reportConfig.sortDirection === 'asc' 
              ? aValue.localeCompare(bValue)
              : bValue.localeCompare(aValue);
          } else {
            return reportConfig.sortDirection === 'asc'
              ? (aValue > bValue ? 1 : -1)
              : (aValue < bValue ? 1 : -1);
          }
        });
      }

      setReportData(data);
      setShowPreview(true);
    } catch (error) {
      console.error('Error generating report:', error);
      setError('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveReport = () => {
    if (!reportConfig.title.trim()) {
      setError('Please provide a report title');
      return;
    }

    const newSavedReports = [...savedReports, reportConfig];
    setSavedReports(newSavedReports);
    localStorage.setItem('savedReports', JSON.stringify(newSavedReports));
    alert('Report saved successfully!');
  };

  const loadSavedReport = (report: ReportConfig) => {
    setReportConfig(report);
  };

  const deleteSavedReport = (index: number) => {
    const newSavedReports = savedReports.filter((_, i) => i !== index);
    setSavedReports(newSavedReports);
    localStorage.setItem('savedReports', JSON.stringify(newSavedReports));
  };

  const exportReport = async (format: 'csv' | 'pdf') => {
    try {
      setLoading(true);
      
      let blob;
      if (format === 'csv') {
        blob = await inventoryService.exportCSV(
          reportConfig.columns,
          reportConfig.columns.map(col => {
            const column = availableColumns.find(c => c.id === col);
            return { id: col, width: 120 }; // Default width
          })
        );
      } else {
        blob = await inventoryService.exportPDF(
          reportConfig.columns,
          reportConfig.title,
          reportConfig.columns.map(col => {
            const column = availableColumns.find(c => c.id === col);
            return { id: col, width: 120 }; // Default width
          })
        );
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${reportConfig.title.replace(/\s+/g, '_')}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error(`Error exporting ${format}:`, error);
      setError(`Failed to export ${format}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center">
          <FileText className="h-6 w-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">Report Builder</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        )}
      </div>

      <div className="p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Report Configuration */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Report Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Report Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={reportConfig.title}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter report title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={reportConfig.description}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter report description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Report Type *
                  </label>
                  <select
                    name="type"
                    value={reportConfig.type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="inventory">Inventory</option>
                    <option value="requisitions">Requisitions</option>
                    <option value="purchase_orders">Purchase Orders</option>
                    <option value="production">Production</option>
                    <option value="stock_movements">Stock Movements</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chart Type
                  </label>
                  <select
                    name="chartType"
                    value={reportConfig.chartType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="table">Table</option>
                    <option value="bar">Bar Chart</option>
                    <option value="pie">Pie Chart</option>
                    <option value="line">Line Chart</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <select
                    value={reportConfig.dateRange}
                    onChange={handleDateRangeChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    <option value="quarter">Last 90 Days</option>
                    <option value="year">Last Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {reportConfig.dateRange === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        name="customStartDate"
                        value={reportConfig.customStartDate}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        name="customEndDate"
                        value={reportConfig.customEndDate}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <select
                      name="sortBy"
                      value={reportConfig.sortBy || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">No Sorting</option>
                      {availableColumns.map(column => (
                        <option key={column.id} value={column.id}>
                          {column.label}
                        </option>
                      ))}
                    </select>
                    <select
                      name="sortDirection"
                      value={reportConfig.sortDirection || 'asc'}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!reportConfig.sortBy}
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Filters</h3>
                <button
                  type="button"
                  onClick={handleAddFilter}
                  className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Filter
                </button>
              </div>

              {reportConfig.filters.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No filters added</p>
              ) : (
                <div className="space-y-4">
                  {reportConfig.filters.map((filter, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <select
                        value={filter.field}
                        onChange={(e) => handleFilterChange(index, 'field', e.target.value)}
                        className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="">Select Field</option>
                        {availableColumns.map(column => (
                          <option key={column.id} value={column.id}>
                            {column.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={filter.operator}
                        onChange={(e) => handleFilterChange(index, 'operator', e.target.value)}
                        className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="equals">Equals</option>
                        <option value="contains">Contains</option>
                        <option value="greater_than">Greater Than</option>
                        <option value="less_than">Less Than</option>
                      </select>
                      <input
                        type="text"
                        value={filter.value}
                        onChange={(e) => handleFilterChange(index, 'value', e.target.value)}
                        className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Value"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFilter(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Saved Reports</h3>
              
              {savedReports.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No saved reports</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {savedReports.map((report, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{report.title}</p>
                        <p className="text-xs text-gray-500">{report.type} report</p>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          type="button"
                          onClick={() => loadSavedReport(report)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Load Report"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSavedReport(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Report"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Middle Column - Column Selection */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 p-4 rounded-lg h-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select Columns</h3>
              
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {availableColumns.map(column => (
                  <div key={column.id} className="flex items-center p-2 hover:bg-gray-100 rounded-lg">
                    <input
                      type="checkbox"
                      id={`column-${column.id}`}
                      checked={reportConfig.columns.includes(column.id)}
                      onChange={() => handleColumnToggle(column.id)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor={`column-${column.id}`} className="ml-2 text-sm font-medium text-gray-700">
                      {column.label}
                    </label>
                  </div>
                ))}
              </div>

              {reportConfig.columns.length === 0 && (
                <div className="mt-4 p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm">
                  Please select at least one column for your report.
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Preview and Actions */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 p-4 rounded-lg h-full flex flex-col">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Report Actions</h3>
              
              <div className="space-y-4 flex-grow">
                <button
                  type="button"
                  onClick={generateReport}
                  disabled={loading || reportConfig.columns.length === 0}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'Generating...' : 'Generate Report'}
                </button>

                <button
                  type="button"
                  onClick={saveReport}
                  disabled={loading || reportConfig.columns.length === 0}
                  className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Report
                </button>

                <div className="border-t border-gray-200 my-4 pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Export Options</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => exportReport('csv')}
                      disabled={loading || reportConfig.columns.length === 0}
                      className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => exportReport('pdf')}
                      disabled={loading || reportConfig.columns.length === 0}
                      className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </button>
                  </div>
                </div>

                <div className="border-t border-gray-200 my-4 pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Chart Preview</h4>
                  <div className="bg-white p-4 rounded-lg border border-gray-200 h-40 flex items-center justify-center">
                    {reportConfig.chartType === 'bar' && <BarChart2 className="h-12 w-12 text-gray-300" />}
                    {reportConfig.chartType === 'pie' && <PieChart className="h-12 w-12 text-gray-300" />}
                    {reportConfig.chartType === 'line' && <TrendingUp className="h-12 w-12 text-gray-300" />}
                    {reportConfig.chartType === 'table' && <FileText className="h-12 w-12 text-gray-300" />}
                    <p className="ml-2 text-sm text-gray-500">
                      {reportConfig.chartType === 'table' ? 'Table view' : `${reportConfig.chartType} chart`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Report Preview */}
        {showPreview && reportData.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Report Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Hide Preview
              </button>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {reportConfig.columns.map(columnId => {
                      const column = availableColumns.find(c => c.id === columnId);
                      return (
                        <th 
                          key={columnId}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {column?.label || columnId}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.slice(0, 10).map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {reportConfig.columns.map(columnId => (
                        <td key={columnId} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCellValue(item[columnId])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {reportData.length > 10 && (
                <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500">
                  Showing 10 of {reportData.length} rows
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to format cell values
const formatCellValue = (value: any): string => {
  if (value === null || value === undefined) {
    return '-';
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  // Check if it's a date string
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return new Date(value).toLocaleDateString();
  }
  
  // Check if it's a number that should be formatted as currency
  if (typeof value === 'number' && ['price', 'cost', 'amount', 'value'].some(term => 
    String(value).toLowerCase().includes(term))) {
    return `$${value.toFixed(2)}`;
  }
  
  return String(value);
};

export default ReportBuilder;