import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Download, 
  Upload, 
  FileText,
  RefreshCw,
  Columns,
  Image
} from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import AddItemModal from './AddItemModal';
import EditItemModal from './EditItemModal';
import StockMovementModal from './StockMovementModal';
import StockAdjustmentModal from './StockAdjustmentModal';
import ColumnCustomizerModal from '../Common/ColumnCustomizer';
import { useLocation } from 'react-router-dom';
import { useColumnPreferences } from '../../hooks/useColumnPreferences';
import InventoryTable from './InventoryTable';
import InventoryStats from './InventoryStats';
import InventoryFilters from './InventoryFilters';

interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  description?: string;
  category_name?: string;
  subcategory_name?: string;
  unit_name?: string;
  location_name?: string;
  supplier_name?: string;
  quantity: number;
  min_quantity: number;
  max_quantity: number;
  unit_price: number;
  last_price?: number;
  average_price?: number;
  total_value: number;
  is_low_stock: boolean;
  item_type: string;
  image_url?: string;
  updated_at: string;
}

const DEFAULT_COLUMNS = [
  { id: 'name', label: 'Item Name', visible: true, width: 200, order: 1 },
  { id: 'sku', label: 'SKU', visible: true, width: 120, order: 2 },
  { id: 'image', label: 'Image', visible: true, width: 80, order: 3 },
  { id: 'category_name', label: 'Category', visible: true, width: 120, order: 4 },
  { id: 'subcategory_name', label: 'Subcategory', visible: false, width: 120, order: 5 },
  { id: 'quantity', label: 'Quantity', visible: true, width: 100, order: 6 },
  { id: 'unit_name', label: 'Unit', visible: true, width: 80, order: 7 },
  { id: 'location_name', label: 'Location', visible: true, width: 120, order: 8 },
  { id: 'supplier_name', label: 'Supplier', visible: false, width: 150, order: 9 },
  { id: 'unit_price', label: 'Unit Price', visible: true, width: 100, order: 10 },
  { id: 'last_price', label: 'Last Price', visible: false, width: 100, order: 11 },
  { id: 'average_price', label: 'Avg Price', visible: false, width: 100, order: 12 },
  { id: 'total_value', label: 'Total Value', visible: true, width: 120, order: 13 },
  { id: 'min_quantity', label: 'Min Qty', visible: false, width: 100, order: 14 },
  { id: 'max_quantity', label: 'Max Qty', visible: false, width: 100, order: 15 },
  { id: 'item_type', label: 'Item Type', visible: true, width: 130, order: 16 },
  { id: 'status', label: 'Status', visible: true, width: 100, order: 17 },
  { id: 'actions', label: 'Actions', visible: true, width: 120, order: 18 }
];

const Inventory: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItemType, setSelectedItemType] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStockMovementModal, setShowStockMovementModal] = useState(false);
  const [showStockAdjustmentModal, setShowStockAdjustmentModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
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
  } = useColumnPreferences('inventory_columns', DEFAULT_COLUMNS);
  
  const { socket } = useSocket();
  const { hasPermission } = useAuth();
  const location = useLocation();

  useEffect(() => {
    loadItems();
    loadCategories();
    
    // Check if we should open the add modal from navigation state
    if (location.state?.openAddModal) {
      setShowAddModal(true);
      // Clear the state to prevent reopening on page refresh
      window.history.replaceState({}, document.title);
    }
  }, [searchTerm, selectedCategory, selectedItemType, pagination.page, location.state]);

  useEffect(() => {
    if (socket) {
      socket.on('item_created', loadItems);
      socket.on('item_updated', loadItems);
      socket.on('item_deleted', loadItems);

      return () => {
        socket.off('item_created');
        socket.off('item_updated');
        socket.off('item_deleted');
      };
    }
  }, [socket]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit
      };

      if (searchTerm) params.search = searchTerm;
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedItemType !== 'all') params.itemType = selectedItemType;

      const response = await inventoryService.getItems(params);
      setItems(response.items);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await inventoryService.getDropdownData();
      setCategories(data.categories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleDeleteItem = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await inventoryService.deleteItem(id);
        loadItems();
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Failed to delete item');
      }
    }
  };

  const handleEditItem = (id: number) => {
    setEditingItemId(id);
    setShowEditModal(true);
  };

  const handleViewStockMovement = (id: number) => {
    setSelectedItemId(id);
    setShowStockMovementModal(true);
  };

  const handleStockAdjustment = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowStockAdjustmentModal(true);
  };

  const handleAddItemClick = () => {
    setShowAddModal(true);
  };

  const handleExportCSV = async () => {
    try {
      // Get visible columns for export
      const visibleColumnIds = visibleColumns
        .filter(col => col.id !== 'actions' && col.id !== 'image')
        .map(col => col.id);
      
      const columnWidths = visibleColumns
        .filter(col => col.id !== 'actions' && col.id !== 'image')
        .map(col => ({ id: col.id, width: col.width }));
      
      const blob = await inventoryService.exportCSV(visibleColumnIds, columnWidths);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'inventory_export.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV');
    }
  };

  const handleExportPDF = async () => {
    try {
      // Get visible columns for export
      const visibleColumnIds = visibleColumns
        .filter(col => col.id !== 'actions' && col.id !== 'image')
        .map(col => col.id);
      
      const columnWidths = visibleColumns
        .filter(col => col.id !== 'actions' && col.id !== 'image')
        .map(col => ({ id: col.id, width: col.width }));
      
      const blob = await inventoryService.exportPDF(visibleColumnIds, 'Inventory Report', columnWidths);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'inventory_report.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF');
    }
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await inventoryService.importCSV(file);
      alert(`Import completed: ${result.imported} items imported, ${result.errors.length} errors`);
      loadItems();
    } catch (error) {
      console.error('Error importing CSV:', error);
      alert('Failed to import CSV');
    }
    
    // Reset file input
    event.target.value = '';
  };

  const totalItems = items.length;
  const inStockItems = items.filter(item => item.quantity > 0 && !item.is_low_stock).length;
  const lowStockItems = items.filter(item => item.is_low_stock && item.quantity > 0).length;
  const outOfStockItems = items.filter(item => item.quantity === 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">Track and manage your inventory items</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowColumnCustomizer(true)}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Columns className="w-4 h-4 mr-2" />
            Columns
          </button>
          
          {hasPermission('inventory.export') && (
            <>
              <button
                onClick={handleExportCSV}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                Export PDF
              </button>
            </>
          )}
          
          {hasPermission('inventory.import') && (
            <label className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                className="hidden"
              />
            </label>
          )}
          
          <button
            onClick={loadItems}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          
          {hasPermission('inventory.create') && (
            <button 
              onClick={handleAddItemClick}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <InventoryStats 
        totalItems={pagination.total}
        inStockItems={inStockItems}
        lowStockItems={lowStockItems}
        outOfStockItems={outOfStockItems}
      />

      {/* Filters */}
      <InventoryFilters 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedItemType={selectedItemType}
        setSelectedItemType={setSelectedItemType}
        categories={categories}
      />

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <InventoryTable 
          items={items}
          loading={loading}
          pagination={pagination}
          setPagination={setPagination}
          visibleColumns={visibleColumns}
          handleEditItem={handleEditItem}
          handleViewStockMovement={handleViewStockMovement}
          handleStockAdjustment={handleStockAdjustment}
          handleDeleteItem={handleDeleteItem}
          handleAddItemClick={handleAddItemClick}
        />
      </div>

      {/* Modals */}
      {hasPermission('inventory.create') && (
        <AddItemModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onItemAdded={loadItems}
        />
      )}

      {hasPermission('inventory.edit') && (
        <EditItemModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingItemId(null);
          }}
          onItemUpdated={loadItems}
          itemId={editingItemId}
        />
      )}

      {hasPermission('inventory.view_stock_movements') && (
        <StockMovementModal
          isOpen={showStockMovementModal}
          onClose={() => {
            setShowStockMovementModal(false);
            setSelectedItemId(null);
          }}
          itemId={selectedItemId}
        />
      )}

      {hasPermission('inventory.adjust_stock') && (
        <StockAdjustmentModal
          isOpen={showStockAdjustmentModal}
          onClose={() => {
            setShowStockAdjustmentModal(false);
            setSelectedItem(null);
          }}
          onSuccess={loadItems}
          item={selectedItem}
        />
      )}

      <ColumnCustomizerModal
        isOpen={showColumnCustomizer}
        onClose={() => setShowColumnCustomizer(false)}
        onSave={handleSaveColumnPreferences}
        columns={columns}
        title="Customize Inventory Columns"
      />
    </div>
  );
};

export default Inventory;