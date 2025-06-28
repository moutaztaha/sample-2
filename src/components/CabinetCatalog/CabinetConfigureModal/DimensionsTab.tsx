import React from 'react';
import { Plus, Minus, Ruler } from 'lucide-react';

interface DimensionsTabProps {
  formData: {
    width: number;
    height: number;
    depth: number;
    panel_material_id: string;
    edge_material_id: string;
    back_material_id: string;
    door_material_id: string;
  };
  model: any;
  materials: any[];
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleDimensionChange: (dimension: 'width' | 'height' | 'depth', value: number) => void;
}

const DimensionsTab: React.FC<DimensionsTabProps> = ({
  formData,
  model,
  materials,
  handleInputChange,
  handleDimensionChange
}) => {
  // Filter materials by type
  const panelMaterials = materials.filter(m => m.type === 'panel');
  const edgeMaterials = materials.filter(m => m.type === 'edge_banding');
  const backMaterials = materials.filter(m => m.type === 'back_panel');

  return (
    <>
      {/* Dimensions */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Dimensions</h3>
        
        <div className="space-y-4">
          {/* Width */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Width (mm) - Min: {model.min_width}, Max: {model.max_width}
            </label>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => handleDimensionChange('width', formData.width - 10)}
                className="p-2 bg-gray-100 rounded-l-lg hover:bg-gray-200 transition-colors"
              >
                <Minus className="h-4 w-4 text-gray-600" />
              </button>
              <input
                type="number"
                name="width"
                value={formData.width}
                onChange={(e) => handleDimensionChange('width', parseInt(e.target.value) || 0)}
                min={model.min_width}
                max={model.max_width}
                className="flex-1 px-3 py-2 border-y border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
              />
              <button
                type="button"
                onClick={() => handleDimensionChange('width', formData.width + 10)}
                className="p-2 bg-gray-100 rounded-r-lg hover:bg-gray-200 transition-colors"
              >
                <Plus className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
          
          {/* Height */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Height (mm) - Min: {model.min_height}, Max: {model.max_height}
            </label>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => handleDimensionChange('height', formData.height - 10)}
                className="p-2 bg-gray-100 rounded-l-lg hover:bg-gray-200 transition-colors"
              >
                <Minus className="h-4 w-4 text-gray-600" />
              </button>
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={(e) => handleDimensionChange('height', parseInt(e.target.value) || 0)}
                min={model.min_height}
                max={model.max_height}
                className="flex-1 px-3 py-2 border-y border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
              />
              <button
                type="button"
                onClick={() => handleDimensionChange('height', formData.height + 10)}
                className="p-2 bg-gray-100 rounded-r-lg hover:bg-gray-200 transition-colors"
              >
                <Plus className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
          
          {/* Depth */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Depth (mm) - Min: {model.min_depth}, Max: {model.max_depth}
            </label>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => handleDimensionChange('depth', formData.depth - 10)}
                className="p-2 bg-gray-100 rounded-l-lg hover:bg-gray-200 transition-colors"
              >
                <Minus className="h-4 w-4 text-gray-600" />
              </button>
              <input
                type="number"
                name="depth"
                value={formData.depth}
                onChange={(e) => handleDimensionChange('depth', parseInt(e.target.value) || 0)}
                min={model.min_depth}
                max={model.max_depth}
                className="flex-1 px-3 py-2 border-y border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
              />
              <button
                type="button"
                onClick={() => handleDimensionChange('depth', formData.depth + 10)}
                className="p-2 bg-gray-100 rounded-r-lg hover:bg-gray-200 transition-colors"
              >
                <Plus className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Materials */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Materials</h3>
        
        <div className="space-y-4">
          {/* Panel Material */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Panel Material
            </label>
            <select
              name="panel_material_id"
              value={formData.panel_material_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Panel Material</option>
              {panelMaterials.map(material => (
                <option key={material.id} value={material.id}>
                  {material.name} - ${material.cost_per_unit.toFixed(2)}/{material.unit}
                </option>
              ))}
            </select>
          </div>
          
          {/* Edge Banding Material */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Edge Banding Material
            </label>
            <select
              name="edge_material_id"
              value={formData.edge_material_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Edge Banding</option>
              {edgeMaterials.map(material => (
                <option key={material.id} value={material.id}>
                  {material.name} - ${material.cost_per_unit.toFixed(2)}/{material.unit}
                </option>
              ))}
            </select>
          </div>
          
          {/* Back Panel Material */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Back Panel Material
            </label>
            <select
              name="back_material_id"
              value={formData.back_material_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Back Panel Material</option>
              {backMaterials.map(material => (
                <option key={material.id} value={material.id}>
                  {material.name} - ${material.cost_per_unit.toFixed(2)}/{material.unit}
                </option>
              ))}
            </select>
          </div>
          
          {/* Door Material (can be same as panel) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Door Material
            </label>
            <select
              name="door_material_id"
              value={formData.door_material_id}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Same as Panel Material</option>
              {panelMaterials.map(material => (
                <option key={material.id} value={material.id}>
                  {material.name} - ${material.cost_per_unit.toFixed(2)}/{material.unit}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </>
  );
};

export default DimensionsTab;