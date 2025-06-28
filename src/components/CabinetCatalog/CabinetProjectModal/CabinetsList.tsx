import React from 'react';
import { Plus, Minus, Trash2, Ruler } from 'lucide-react';

interface CabinetsListProps {
  loading: boolean;
  projectItems: any[];
  handleRemoveCabinet: (cabinetId: number) => void;
  handleUpdateCabinetQuantity: (cabinetId: number, newQuantity: number) => void;
  setShowAddCabinetModal: (show: boolean) => void;
  showAddCabinetModal: boolean;
  selectedModel: string;
  handleModelChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  cabinetDimensions: {
    width: number;
    height: number;
    depth: number;
  };
  handleDimensionChange: (dimension: string, value: number) => void;
  handleAddCabinet: () => void;
  models: any[];
}

const CabinetsList: React.FC<CabinetsListProps> = ({
  loading,
  projectItems,
  handleRemoveCabinet,
  handleUpdateCabinetQuantity,
  setShowAddCabinetModal,
  showAddCabinetModal,
  selectedModel,
  handleModelChange,
  cabinetDimensions,
  handleDimensionChange,
  handleAddCabinet,
  models
}) => {
  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Project Cabinets</h3>
            <button
              onClick={() => setShowAddCabinetModal(true)}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Cabinet
            </button>
          </div>
          
          {showAddCabinetModal && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-md font-medium text-gray-900 mb-4">Add Cabinet to Project</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cabinet Model *
                  </label>
                  <select
                    value={selectedModel}
                    onChange={handleModelChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Cabinet Model</option>
                    {models.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name} ({model.category_name})
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedModel && (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Width (mm)
                      </label>
                      <input
                        type="number"
                        value={cabinetDimensions.width}
                        onChange={(e) => handleDimensionChange('width', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Height (mm)
                      </label>
                      <input
                        type="number"
                        value={cabinetDimensions.height}
                        onChange={(e) => handleDimensionChange('height', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Depth (mm)
                      </label>
                      <input
                        type="number"
                        value={cabinetDimensions.depth}
                        onChange={(e) => handleDimensionChange('depth', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowAddCabinetModal(false)}
                  className="px-3 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCabinet}
                  disabled={!selectedModel || loading}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Adding...' : 'Add Cabinet'}
                </button>
              </div>
            </div>
          )}
          
          {projectItems.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="mt-2 text-sm font-medium text-gray-900">No cabinets in this project</h3>
              <p className="mt-1 text-sm text-gray-500">
                Add cabinets from the catalog to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {projectItems.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center">
                      <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                        <img 
                          src={item.model_image || 'https://via.placeholder.com/64?text=No+Image'} 
                          alt={item.name}
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null; // Prevent infinite loop
                            target.src = 'https://via.placeholder.com/64?text=No+Image';
                          }}
                        />
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">{item.name}</h4>
                        <div className="flex items-center text-sm text-gray-600">
                          <Ruler className="h-4 w-4 mr-1" />
                          {item.width} × {item.height} × {item.depth} mm
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 md:mt-0 flex items-center">
                      <div className="mr-4 text-right">
                        <div className="text-sm text-gray-600">Unit Cost:</div>
                        <div className="text-lg font-medium text-gray-900">${item.unit_cost.toFixed(2)}</div>
                      </div>
                      <div className="flex items-center">
                        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                          <button
                            onClick={() => handleUpdateCabinetQuantity(item.id, item.quantity - 1)}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 transition-colors"
                          >
                            <Minus className="h-4 w-4 text-gray-600" />
                          </button>
                          <div className="px-4 py-2 text-gray-700">
                            {item.quantity}
                          </div>
                          <button
                            onClick={() => handleUpdateCabinetQuantity(item.id, item.quantity + 1)}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 transition-colors"
                          >
                            <Plus className="h-4 w-4 text-gray-600" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemoveCabinet(item.id)}
                          className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Panel Material:</span>
                      <span className="ml-2 text-gray-900">{item.panel_material_name || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Edge Material:</span>
                      <span className="ml-2 text-gray-900">{item.edge_material_name || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Parts:</span>
                      <span className="ml-2 text-gray-900">{item.parts?.length || 0} parts</span>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-blue-900">Total</h3>
                    <p className="text-sm text-blue-700">
                      {projectItems.reduce((sum, item) => sum + item.quantity, 0)} cabinets
                    </p>
                  </div>
                  <div className="text-xl font-bold text-blue-900">
                    ${projectItems.reduce((sum, item) => sum + item.total_cost, 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CabinetsList;