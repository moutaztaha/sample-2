import React, { useState, useEffect } from 'react';
import { X, Save, Package, Ruler, DollarSign, Plus, Minus, Layers } from 'lucide-react';
import { cabinetService } from '../../services/cabinetService';

interface CabinetConfigureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  model: any;
  materials: any[];
  hardware: any[];
}

const CabinetConfigureModal: React.FC<CabinetConfigureModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  model,
  materials,
  hardware
}) => {
  const [formData, setFormData] = useState({
    width: 0,
    height: 0,
    depth: 0,
    panel_material_id: '',
    edge_material_id: '',
    back_material_id: '',
    door_material_id: '',
    hardware_config: {
      hinges: 0,
      handles: 0,
      shelf_pins: 0,
      drawer_slides: 0
    }
  });
  
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    if (isOpen && model) {
      // Reset form with model defaults
      setFormData({
        width: model.default_width,
        height: model.default_height,
        depth: model.default_depth,
        panel_material_id: '',
        edge_material_id: '',
        back_material_id: '',
        door_material_id: '',
        hardware_config: {
          hinges: 0,
          handles: 0,
          shelf_pins: 0,
          drawer_slides: 0
        }
      });
      
      // Load projects for dropdown
      loadProjects();
      
      // Calculate initial price
      calculateCabinet();
    }
  }, [isOpen, model]);

  const loadProjects = async () => {
    try {
      const data = await cabinetService.getProjects();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDimensionChange = (dimension: 'width' | 'height' | 'depth', value: number) => {
    // Ensure value is within min/max range
    let newValue = value;
    
    if (dimension === 'width') {
      newValue = Math.max(model.min_width, Math.min(model.max_width, value));
    } else if (dimension === 'height') {
      newValue = Math.max(model.min_height, Math.min(model.max_height, value));
    } else if (dimension === 'depth') {
      newValue = Math.max(model.min_depth, Math.min(model.max_depth, value));
    }
    
    setFormData(prev => ({
      ...prev,
      [dimension]: newValue
    }));
  };

  const handleHardwareChange = (type: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      hardware_config: {
        ...prev.hardware_config,
        [type]: value
      }
    }));
  };

  const calculateCabinet = async () => {
    try {
      setCalculating(true);
      setError('');
      
      // Validate required fields
      if (!formData.width || !formData.height || !formData.depth) {
        setError('Width, height, and depth are required');
        setCalculating(false);
        return;
      }
      
      const result = await cabinetService.calculateCabinet({
        model_id: model.id,
        width: formData.width,
        height: formData.height,
        depth: formData.depth,
        panel_material_id: formData.panel_material_id || null,
        edge_material_id: formData.edge_material_id || null,
        back_material_id: formData.back_material_id || null,
        door_material_id: formData.door_material_id || null,
        hardware_config: formData.hardware_config
      });
      
      setCalculationResult(result);
    } catch (error) {
      console.error('Error calculating cabinet:', error);
      setError(error instanceof Error ? error.message : 'Failed to calculate cabinet');
    } finally {
      setCalculating(false);
    }
  };

  const handleCreateProject = async () => {
    try {
      if (!newProjectName.trim()) {
        setError('Project name is required');
        return;
      }
      
      const result = await cabinetService.createProject({
        name: newProjectName,
        description: `Project for ${model.name}`,
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        status: 'draft'
      });
      
      // Reload projects and select the new one
      await loadProjects();
      setSelectedProject(result.id.toString());
      setShowCreateProject(false);
      setNewProjectName('');
    } catch (error) {
      console.error('Error creating project:', error);
      setError(error instanceof Error ? error.message : 'Failed to create project');
    }
  };

  const handleAddToProject = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!selectedProject) {
        setError('Please select a project');
        setLoading(false);
        return;
      }
      
      // Validate required fields
      if (!formData.width || !formData.height || !formData.depth) {
        setError('Width, height, and depth are required');
        setLoading(false);
        return;
      }
      
      await cabinetService.addCabinetToProject(parseInt(selectedProject), {
        model_id: model.id,
        name: `${model.name} ${formData.width}x${formData.height}x${formData.depth}mm`,
        width: formData.width,
        height: formData.height,
        depth: formData.depth,
        quantity: 1,
        panel_material_id: formData.panel_material_id || null,
        edge_material_id: formData.edge_material_id || null,
        back_material_id: formData.back_material_id || null,
        door_material_id: formData.door_material_id || null,
        hardware_config: formData.hardware_config
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error adding cabinet to project:', error);
      setError(error instanceof Error ? error.message : 'Failed to add cabinet to project');
    } finally {
      setLoading(false);
    }
  };

  // Filter materials by type
  const panelMaterials = materials.filter(m => m.type === 'panel');
  const edgeMaterials = materials.filter(m => m.type === 'edge_banding');
  const backMaterials = materials.filter(m => m.type === 'back_panel');

  if (!isOpen || !model) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-6xl flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <Package className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Configure Cabinet</h2>
              <p className="text-sm text-gray-600">{model.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4 sm:p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Configuration */}
              <div className="space-y-6">
                {/* Cabinet Image */}
                <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center">
                  <img 
                    src={model.image_url || 'https://via.placeholder.com/400x300?text=No+Image'} 
                    alt={model.name}
                    className="max-h-64 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=No+Image';
                    }}
                  />
                </div>

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

                {/* Hardware */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Hardware</h3>
                  
                  <div className="space-y-4">
                    {/* Hinges */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Hinges
                      </label>
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => handleHardwareChange('hinges', Math.max(0, formData.hardware_config.hinges - 1))}
                          className="p-2 bg-gray-100 rounded-l-lg hover:bg-gray-200 transition-colors"
                        >
                          <Minus className="h-4 w-4 text-gray-600" />
                        </button>
                        <input
                          type="number"
                          value={formData.hardware_config.hinges}
                          onChange={(e) => handleHardwareChange('hinges', parseInt(e.target.value) || 0)}
                          min="0"
                          className="flex-1 px-3 py-2 border-y border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                        />
                        <button
                          type="button"
                          onClick={() => handleHardwareChange('hinges', formData.hardware_config.hinges + 1)}
                          className="p-2 bg-gray-100 rounded-r-lg hover:bg-gray-200 transition-colors"
                        >
                          <Plus className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Handles */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Handles
                      </label>
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => handleHardwareChange('handles', Math.max(0, formData.hardware_config.handles - 1))}
                          className="p-2 bg-gray-100 rounded-l-lg hover:bg-gray-200 transition-colors"
                        >
                          <Minus className="h-4 w-4 text-gray-600" />
                        </button>
                        <input
                          type="number"
                          value={formData.hardware_config.handles}
                          onChange={(e) => handleHardwareChange('handles', parseInt(e.target.value) || 0)}
                          min="0"
                          className="flex-1 px-3 py-2 border-y border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                        />
                        <button
                          type="button"
                          onClick={() => handleHardwareChange('handles', formData.hardware_config.handles + 1)}
                          className="p-2 bg-gray-100 rounded-r-lg hover:bg-gray-200 transition-colors"
                        >
                          <Plus className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Shelf Pins */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Shelf Support Pins
                      </label>
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => handleHardwareChange('shelf_pins', Math.max(0, formData.hardware_config.shelf_pins - 4))}
                          className="p-2 bg-gray-100 rounded-l-lg hover:bg-gray-200 transition-colors"
                        >
                          <Minus className="h-4 w-4 text-gray-600" />
                        </button>
                        <input
                          type="number"
                          value={formData.hardware_config.shelf_pins}
                          onChange={(e) => handleHardwareChange('shelf_pins', parseInt(e.target.value) || 0)}
                          min="0"
                          step="4"
                          className="flex-1 px-3 py-2 border-y border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                        />
                        <button
                          type="button"
                          onClick={() => handleHardwareChange('shelf_pins', formData.hardware_config.shelf_pins + 4)}
                          className="p-2 bg-gray-100 rounded-r-lg hover:bg-gray-200 transition-colors"
                        >
                          <Plus className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Drawer Slides */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Drawer Slides (pairs)
                      </label>
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => handleHardwareChange('drawer_slides', Math.max(0, formData.hardware_config.drawer_slides - 1))}
                          className="p-2 bg-gray-100 rounded-l-lg hover:bg-gray-200 transition-colors"
                        >
                          <Minus className="h-4 w-4 text-gray-600" />
                        </button>
                        <input
                          type="number"
                          value={formData.hardware_config.drawer_slides}
                          onChange={(e) => handleHardwareChange('drawer_slides', parseInt(e.target.value) || 0)}
                          min="0"
                          className="flex-1 px-3 py-2 border-y border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                        />
                        <button
                          type="button"
                          onClick={() => handleHardwareChange('drawer_slides', formData.hardware_config.drawer_slides + 1)}
                          className="p-2 bg-gray-100 rounded-r-lg hover:bg-gray-200 transition-colors"
                        >
                          <Plus className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Results */}
              <div className="space-y-6">
                {/* Calculate Button */}
                <button
                  onClick={calculateCabinet}
                  disabled={calculating}
                  className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {calculating ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  ) : (
                    <DollarSign className="h-5 w-5 mr-2" />
                  )}
                  {calculating ? 'Calculating...' : 'Calculate Cost'}
                </button>

                {/* Calculation Results */}
                {calculationResult && (
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Calculation Results</h3>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-blue-800 font-medium">Total Cost:</span>
                        <span className="text-xl font-bold text-blue-800">${calculationResult.total_cost.toFixed(2)}</span>
                      </div>
                      
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-700 mb-2">Parts Summary</h4>
                        <p className="text-sm text-gray-600">Total Parts: {calculationResult.parts_count}</p>
                      </div>
                      
                      {/* Parts List */}
                      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dimensions (mm)</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {calculationResult.parts.map((part: any, index: number) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{part.name}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {part.part_type === 'hardware' 
                                    ? `${part.quantity} units` 
                                    : `${part.width} × ${part.height} × ${part.thickness}`}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">${part.total_cost.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Add to Project */}
                {calculationResult && (
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Add to Project</h3>
                    
                    {showCreateProject ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            New Project Name
                          </label>
                          <input
                            type="text"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter project name"
                          />
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setShowCreateProject(false)}
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleCreateProject}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Create Project
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Project
                          </label>
                          <div className="flex space-x-2">
                            <select
                              value={selectedProject}
                              onChange={(e) => setSelectedProject(e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Select a project</option>
                              {projects.map(project => (
                                <option key={project.id} value={project.id}>
                                  {project.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => setShowCreateProject(true)}
                              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        <button
                          onClick={handleAddToProject}
                          disabled={loading || !selectedProject}
                          className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {loading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          ) : (
                            <Layers className="h-4 w-4 mr-2" />
                          )}
                          {loading ? 'Adding...' : 'Add to Project'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex justify-end p-4 sm:p-6 border-t border-gray-200 flex-shrink-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CabinetConfigureModal;