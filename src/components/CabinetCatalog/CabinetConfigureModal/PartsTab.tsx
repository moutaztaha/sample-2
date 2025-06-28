import React from 'react';

interface PartsTabProps {
  modelParts: any[];
  handlePartChange: (partIndex: number, field: string, value: any) => void;
}

const PartsTab: React.FC<PartsTabProps> = ({ modelParts, handlePartChange }) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Cabinet Parts</h3>
      
      {modelParts.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No parts defined for this cabinet model</p>
      ) : (
        <div className="space-y-6">
          {modelParts.map((part, index) => (
            <div key={index} className="border border-gray-200 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-900">{part.part_type_name}</h4>
                <span className="text-sm text-gray-500">{part.part_type_description}</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity Formula
                  </label>
                  <input
                    type="text"
                    value={part.quantity_formula}
                    onChange={(e) => handlePartChange(index, 'quantity_formula', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thickness (mm)
                  </label>
                  <input
                    type="number"
                    value={part.default_thickness}
                    onChange={(e) => handlePartChange(index, 'default_thickness', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Width Formula
                  </label>
                  <input
                    type="text"
                    value={part.custom_formula_width || part.default_formula_width}
                    onChange={(e) => handlePartChange(index, 'custom_formula_width', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Height Formula
                  </label>
                  <input
                    type="text"
                    value={part.custom_formula_height || part.default_formula_height}
                    onChange={(e) => handlePartChange(index, 'custom_formula_height', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grain Direction
                </label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name={`grain_${index}`}
                      value="with_grain"
                      checked={part.grain_direction === 'with_grain'}
                      onChange={() => handlePartChange(index, 'grain_direction', 'with_grain')}
                      className="form-radio h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">With Grain</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name={`grain_${index}`}
                      value="against_grain"
                      checked={part.grain_direction === 'against_grain'}
                      onChange={() => handlePartChange(index, 'grain_direction', 'against_grain')}
                      className="form-radio h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">Against Grain</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name={`grain_${index}`}
                      value="no_grain"
                      checked={part.grain_direction === 'no_grain'}
                      onChange={() => handlePartChange(index, 'grain_direction', 'no_grain')}
                      className="form-radio h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">No Grain</span>
                  </label>
                </div>
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Edge Banding
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={part.default_edge_top}
                      onChange={(e) => handlePartChange(index, 'default_edge_top', e.target.checked)}
                      className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">Top</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={part.default_edge_bottom}
                      onChange={(e) => handlePartChange(index, 'default_edge_bottom', e.target.checked)}
                      className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">Bottom</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={part.default_edge_left}
                      onChange={(e) => handlePartChange(index, 'default_edge_left', e.target.checked)}
                      className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">Left</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={part.default_edge_right}
                      onChange={(e) => handlePartChange(index, 'default_edge_right', e.target.checked)}
                      className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">Right</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PartsTab;