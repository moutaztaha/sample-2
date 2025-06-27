import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  X, 
  Save, 
  Layout, 
  Eye, 
  EyeOff,
  ArrowUp,
  ArrowDown,
  Check,
  RefreshCw
} from 'lucide-react';

interface UserDashboardSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
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

const UserDashboardSettings: React.FC<UserDashboardSettingsProps> = ({ 
  isOpen, 
  onClose, 
  onSave 
}) => {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = () => {
    try {
      const savedWidgets = localStorage.getItem('dashboardWidgetSettings');
      if (savedWidgets) {
        setWidgets(JSON.parse(savedWidgets));
      } else {
        setWidgets(DEFAULT_WIDGETS);
      }
    } catch (error) {
      console.error('Error loading dashboard settings:', error);
      setError('Failed to load dashboard settings');
      setWidgets(DEFAULT_WIDGETS);
    }
  };

  const handleSave = () => {
    try {
      setLoading(true);
      localStorage.setItem('dashboardWidgetSettings', JSON.stringify(widgets));
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving dashboard settings:', error);
      setError('Failed to save dashboard settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = (id: string) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === id ? { ...widget, visible: !widget.visible } : widget
    ));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    
    const newWidgets = [...widgets];
    const temp = { ...newWidgets[index] };
    
    // Swap order values
    const tempOrder = temp.order;
    temp.order = newWidgets[index - 1].order;
    newWidgets[index - 1].order = tempOrder;
    
    // Swap positions in array
    newWidgets[index] = newWidgets[index - 1];
    newWidgets[index - 1] = temp;
    
    setWidgets(newWidgets);
  };

  const handleMoveDown = (index: number) => {
    if (index === widgets.length - 1) return;
    
    const newWidgets = [...widgets];
    const temp = { ...newWidgets[index] };
    
    // Swap order values
    const tempOrder = temp.order;
    temp.order = newWidgets[index + 1].order;
    newWidgets[index + 1].order = tempOrder;
    
    // Swap positions in array
    newWidgets[index] = newWidgets[index + 1];
    newWidgets[index + 1] = temp;
    
    setWidgets(newWidgets);
  };

  const handleReset = () => {
    setWidgets(DEFAULT_WIDGETS);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Settings className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Dashboard Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="flex justify-between mb-4">
            <p className="text-sm text-gray-600">
              Customize your dashboard by showing/hiding widgets and changing their order.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Reset to Default
            </button>
          </div>

          <div className="space-y-4">
            {widgets.map((widget, index) => (
              <div key={widget.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <button
                    onClick={() => handleToggleVisibility(widget.id)}
                    className={`p-1 rounded ${widget.visible ? 'text-green-600 hover:bg-green-50' : 'text-red-600 hover:bg-red-50'} transition-colors`}
                    title={widget.visible ? 'Hide Widget' : 'Show Widget'}
                  >
                    {widget.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <span className={`ml-2 text-sm font-medium ${widget.visible ? 'text-gray-900' : 'text-gray-400'}`}>
                    {widget.title}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === widgets.length - 1}
                    className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDashboardSettings;