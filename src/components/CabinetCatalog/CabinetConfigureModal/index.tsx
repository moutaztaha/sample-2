import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cabinetService } from '../../../services/cabinetService';
import DimensionsTab from './DimensionsTab';
import PartsTab from './PartsTab';
import AccessoriesTab from './AccessoriesTab';
import ProjectSelector from './ProjectSelector';
import CalculationSummary from './CalculationSummary';

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
  const [modelParts, setModelParts] = useState<any[]>([]);
  const [modelAccessories, setModelAccessories] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'dimensions' | 'parts' | 'accessories'>('dimensions');

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
      
      // Load model parts and accessories
      loadModelParts();
      loadModelAccessories();
      
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

  const loadModelParts = async () => {
    try {
      if (!model) return;
      const parts = await cabinetService.getModelParts(model.id);
      setModelParts(parts);
    } catch (error) {
      console.error('Error loading model parts:', error);
    }
  };

  const loadModelAccessories = async () => {
    try {
      if (!model) return;
      const accessories = await cabinetService.getModelAccessories(model.id);
      setModelAccessories(accessories);
    } catch (error) {
      console.error('Error loading model accessories:', error);
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

  const handlePartChange = (partIndex: number, field: string, value: any) => {
    setModelParts(prev => {
      const updated = [...prev];
      updated[partIndex] = {
        ...updated[partIndex],
        [field]: value
      };
      return updated;
    });
  };

  const handleAccessoryChange = (accessoryIndex: number, field: string, value: any) => {
    setModelAccessories(prev => {
      const updated = [...prev];
      updated[accessoryIndex] = {
        ...updated[accessoryIndex],
        [field]: value
      };
      return updated;
    });
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
        hardware_config: formData.hardware_config,
        model_parts: modelParts,
        model_accessories: modelAccessories
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
        hardware_config: formData.hardware_config,
        model_parts: modelParts,
        model_accessories: modelAccessories
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error adding cabinet to project:', error);
      setError(error instanceof Error ? error.message : 'Failed to add cabinet to project');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !model) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-6xl flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
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

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('dimensions')}
              className={`${
                activeTab === 'dimensions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
            >
              Dimensions
            </button>
            <button
              onClick={() => setActiveTab('parts')}
              className={`${
                activeTab === 'parts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
            >
              Parts
            </button>
            <button
              onClick={() => setActiveTab('accessories')}
              className={`${
                activeTab === 'accessories'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
            >
              Accessories
            </button>
          </nav>
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
                      const target = e.target as HTMLImageElement;
                      target.onerror = null; // Prevent infinite loop
                      target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                    }}
                  />
                </div>

                {activeTab === 'dimensions' && (
                  <DimensionsTab 
                    formData={formData}
                    model={model}
                    materials={materials}
                    handleInputChange={handleInputChange}
                    handleDimensionChange={handleDimensionChange}
                  />
                )}

                {activeTab === 'parts' && (
                  <PartsTab 
                    modelParts={modelParts}
                    handlePartChange={handlePartChange}
                  />
                )}

                {activeTab === 'accessories' && (
                  <AccessoriesTab 
                    modelAccessories={modelAccessories}
                    handleAccessoryChange={handleAccessoryChange}
                  />
                )}
              </div>

              {/* Right Column - Results */}
              <div className="space-y-6">
                {/* Calculate Button */}
                <button
                  onClick={calculateCabinet}
                  disabled={calculating}
                  className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {calculating ? 'Calculating...' : 'Calculate Cost'}
                </button>

                {/* Calculation Results */}
                {calculationResult && (
                  <CalculationSummary calculationResult={calculationResult} />
                )}

                {/* Add to Project */}
                {calculationResult && (
                  <ProjectSelector
                    projects={projects}
                    selectedProject={selectedProject}
                    setSelectedProject={setSelectedProject}
                    showCreateProject={showCreateProject}
                    setShowCreateProject={setShowCreateProject}
                    newProjectName={newProjectName}
                    setNewProjectName={setNewProjectName}
                    handleCreateProject={handleCreateProject}
                    handleAddToProject={handleAddToProject}
                    loading={loading}
                  />
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