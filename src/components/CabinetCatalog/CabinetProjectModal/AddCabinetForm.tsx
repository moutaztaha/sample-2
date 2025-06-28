import React from 'react';

interface AddCabinetFormProps {
  selectedModel: string;
  handleModelChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  cabinetDimensions: {
    width: number;
    height: number;
    depth: number;
  };
  handleDimensionChange: (dimension: string, value: number) => void;
  handleAddCabinet: () => void;
  handleCancel: () => void;
  models: any[];
  loading: boolean;
}

const AddCabinetForm: React.FC<AddCabinetFormProps> = ({
  selectedModel,
  handleModelChange,
  cabinetDimensions,
  handleDimensionChange,
  handleAddCabinet,
  handleCancel,
  models,
  loading
}) => {
  return (
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
          onClick={handleCancel}
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
  );
};

export default AddCabinetForm;