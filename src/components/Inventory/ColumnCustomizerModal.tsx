import React, { useState, useEffect } from 'react';
import { X, Save, Columns, ArrowUp, ArrowDown } from 'lucide-react';

interface Column {
  id: string;
  label: string;
  visible: boolean;
  width: number;
  order: number;
}

interface ColumnCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (columns: Column[]) => void;
  columns: Column[];
}

const ColumnCustomizerModal: React.FC<ColumnCustomizerModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave,
  columns: initialColumns
}) => {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Sort columns by order
      const sortedColumns = [...initialColumns].sort((a, b) => a.order - b.order);
      setColumns(sortedColumns);
    }
  }, [isOpen, initialColumns]);

  const handleToggleVisibility = (id: string) => {
    setColumns(prev => prev.map(col => 
      col.id === id ? { ...col, visible: !col.visible } : col
    ));
  };

  const handleWidthChange = (id: string, width: number) => {
    setColumns(prev => prev.map(col => 
      col.id === id ? { ...col, width } : col
    ));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    
    const newColumns = [...columns];
    const temp = { ...newColumns[index] };
    
    // Swap order values
    const tempOrder = temp.order;
    temp.order = newColumns[index - 1].order;
    newColumns[index - 1].order = tempOrder;
    
    // Swap positions in array
    newColumns[index] = newColumns[index - 1];
    newColumns[index - 1] = temp;
    
    setColumns(newColumns);
  };

  const handleMoveDown = (index: number) => {
    if (index === columns.length - 1) return;
    
    const newColumns = [...columns];
    const temp = { ...newColumns[index] };
    
    // Swap order values
    const tempOrder = temp.order;
    temp.order = newColumns[index + 1].order;
    newColumns[index + 1].order = tempOrder;
    
    // Swap positions in array
    newColumns[index] = newColumns[index + 1];
    newColumns[index + 1] = temp;
    
    setColumns(newColumns);
  };

  const handleSelectAll = () => {
    setColumns(prev => prev.map(col => ({ ...col, visible: true })));
  };

  const handleSelectNone = () => {
    setColumns(prev => prev.map(col => ({ ...col, visible: false })));
  };

  const handleSave = () => {
    setLoading(true);
    
    // Ensure at least one column is visible
    if (!columns.some(col => col.visible)) {
      alert('At least one column must be visible');
      setLoading(false);
      return;
    }
    
    onSave(columns);
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Columns className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Customize Columns</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="flex justify-between mb-4">
            <p className="text-sm text-gray-600">
              Select columns to display and customize their order and width.
            </p>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={handleSelectNone}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Select None
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {columns.map((column, index) => (
              <div key={column.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id={`column-${column.id}`}
                    checked={column.visible}
                    onChange={() => handleToggleVisibility(column.id)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor={`column-${column.id}`} className="ml-2 text-sm font-medium text-gray-700">
                    {column.label}
                  </label>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500 mr-2">Width:</span>
                    <input
                      type="number"
                      min="50"
                      max="500"
                      value={column.width}
                      onChange={(e) => handleWidthChange(column.id, parseInt(e.target.value) || 100)}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-xs text-gray-500 ml-1">px</span>
                  </div>
                  
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === columns.length - 1}
                      className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
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

export default ColumnCustomizerModal;