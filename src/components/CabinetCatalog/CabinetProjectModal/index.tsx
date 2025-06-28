import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cabinetService } from '../../../services/cabinetService';
import ProjectDetails from './ProjectDetails';
import CabinetsList from './CabinetsList';
import PartsList from './PartsList';
import AddCabinetForm from './AddCabinetForm';

interface CabinetProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  project: any;
  models: any[];
  materials: any[];
  hardware: any[];
}

const CabinetProjectModal: React.FC<CabinetProjectModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  project,
  models,
  materials,
  hardware
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    status: 'draft'
  });
  
  const [projectItems, setProjectItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'cabinets' | 'parts'>('details');
  const [isNewProject, setIsNewProject] = useState(true);
  const [showAddCabinetModal, setShowAddCabinetModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [cabinetDimensions, setCabinetDimensions] = useState({
    width: 0,
    height: 0,
    depth: 0
  });

  useEffect(() => {
    if (isOpen) {
      if (project) {
        // Edit existing project
        setFormData({
          name: project.name || '',
          description: project.description || '',
          customer_name: project.customer_name || '',
          customer_email: project.customer_email || '',
          customer_phone: project.customer_phone || '',
          status: project.status || 'draft'
        });
        
        setIsNewProject(false);
        loadProjectDetails();
      } else {
        // New project
        setFormData({
          name: '',
          description: '',
          customer_name: '',
          customer_email: '',
          customer_phone: '',
          status: 'draft'
        });
        
        setProjectItems([]);
        setIsNewProject(true);
      }
    }
  }, [isOpen, project]);

  const loadProjectDetails = async () => {
    try {
      setLoading(true);
      const data = await cabinetService.getProject(project.id);
      setProjectItems(data.items || []);
    } catch (error) {
      console.error('Error loading project details:', error);
      setError('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.name) {
        setError('Project name is required');
        setLoading(false);
        return;
      }

      if (isNewProject) {
        // Create new project
        await cabinetService.createProject(formData);
      } else {
        // Update existing project
        await cabinetService.updateProject(project.id, formData);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving project:', error);
      setError(error instanceof Error ? error.message : 'Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCuttingList = () => {
    // This would generate and download a cutting list
    console.log('Export cutting list for project:', project.id);
  };

  const handleExportCostEstimate = () => {
    // This would generate and download a cost estimate
    console.log('Export cost estimate for project:', project.id);
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const modelId = e.target.value;
    setSelectedModel(modelId);
    
    // Set default dimensions based on selected model
    if (modelId) {
      const model = models.find(m => m.id.toString() === modelId);
      if (model) {
        setCabinetDimensions({
          width: model.default_width,
          height: model.default_height,
          depth: model.default_depth
        });
      }
    }
  };

  const handleDimensionChange = (dimension: string, value: number) => {
    setCabinetDimensions(prev => ({
      ...prev,
      [dimension]: value
    }));
  };

  const handleAddCabinet = async () => {
    try {
      if (!selectedModel) {
        setError('Please select a cabinet model');
        return;
      }
      
      if (!project || !project.id) {
        setError('Please save the project first');
        return;
      }
      
      setLoading(true);
      
      const model = models.find(m => m.id.toString() === selectedModel);
      if (!model) {
        setError('Selected model not found');
        setLoading(false);
        return;
      }
      
      // Validate dimensions
      if (cabinetDimensions.width < model.min_width || cabinetDimensions.width > model.max_width) {
        setError(`Width must be between ${model.min_width}mm and ${model.max_width}mm`);
        setLoading(false);
        return;
      }
      
      if (cabinetDimensions.height < model.min_height || cabinetDimensions.height > model.max_height) {
        setError(`Height must be between ${model.min_height}mm and ${model.max_height}mm`);
        setLoading(false);
        return;
      }
      
      if (cabinetDimensions.depth < model.min_depth || cabinetDimensions.depth > model.max_depth) {
        setError(`Depth must be between ${model.min_depth}mm and ${model.max_depth}mm`);
        setLoading(false);
        return;
      }
      
      // Add cabinet to project
      await cabinetService.addCabinetToProject(project.id, {
        model_id: parseInt(selectedModel),
        name: `${model.name} ${cabinetDimensions.width}x${cabinetDimensions.height}x${cabinetDimensions.depth}mm`,
        width: cabinetDimensions.width,
        height: cabinetDimensions.height,
        depth: cabinetDimensions.depth,
        quantity: 1
      });
      
      // Reload project details
      await loadProjectDetails();
      
      // Reset form
      setSelectedModel('');
      setShowAddCabinetModal(false);
      
    } catch (error) {
      console.error('Error adding cabinet:', error);
      setError(error instanceof Error ? error.message : 'Failed to add cabinet');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCabinet = async (cabinetId: number) => {
    try {
      if (!project || !project.id) {
        setError('Project not found');
        return;
      }
      
      if (!confirm('Are you sure you want to remove this cabinet?')) {
        return;
      }
      
      setLoading(true);
      
      // This would call an API to remove the cabinet
      // await cabinetService.removeCabinetFromProject(project.id, cabinetId);
      
      // For now, just update the UI
      setProjectItems(prev => prev.filter(item => item.id !== cabinetId));
      
    } catch (error) {
      console.error('Error removing cabinet:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove cabinet');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCabinetQuantity = async (cabinetId: number, newQuantity: number) => {
    try {
      if (!project || !project.id) {
        setError('Project not found');
        return;
      }
      
      if (newQuantity < 1) {
        return;
      }
      
      setLoading(true);
      
      // This would call an API to update the cabinet quantity
      // await cabinetService.updateCabinetQuantity(project.id, cabinetId, newQuantity);
      
      // For now, just update the UI
      setProjectItems(prev => prev.map(item => 
        item.id === cabinetId ? { ...item, quantity: newQuantity, total_cost: item.unit_cost * newQuantity } : item
      ));
      
    } catch (error) {
      console.error('Error updating cabinet quantity:', error);
      setError(error instanceof Error ? error.message : 'Failed to update cabinet quantity');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-6xl flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isNewProject ? 'Create Project' : 'Project Details'}
              </h2>
              {!isNewProject && <p className="text-sm text-gray-600">{project.name}</p>}
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
        {!isNewProject && (
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('details')}
                className={`${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
              >
                Project Details
              </button>
              <button
                onClick={() => setActiveTab('cabinets')}
                className={`${
                  activeTab === 'cabinets'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
              >
                Cabinets ({projectItems.length})
              </button>
              <button
                onClick={() => setActiveTab('parts')}
                className={`${
                  activeTab === 'parts'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
              >
                Parts List
              </button>
            </nav>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-4 sm:p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Project Details Tab */}
            {(isNewProject || activeTab === 'details') && (
              <ProjectDetails 
                formData={formData}
                handleInputChange={handleInputChange}
                handleSubmit={handleSubmit}
                isNewProject={isNewProject}
                project={project}
                handleExportCostEstimate={handleExportCostEstimate}
                handleExportCuttingList={handleExportCuttingList}
                loading={loading}
              />
            )}

            {/* Cabinets Tab */}
            {!isNewProject && activeTab === 'cabinets' && (
              <CabinetsList 
                loading={loading}
                projectItems={projectItems}
                handleRemoveCabinet={handleRemoveCabinet}
                handleUpdateCabinetQuantity={handleUpdateCabinetQuantity}
                setShowAddCabinetModal={setShowAddCabinetModal}
                showAddCabinetModal={showAddCabinetModal}
                selectedModel={selectedModel}
                handleModelChange={handleModelChange}
                cabinetDimensions={cabinetDimensions}
                handleDimensionChange={handleDimensionChange}
                handleAddCabinet={handleAddCabinet}
                models={models}
              />
            )}

            {/* Parts List Tab */}
            {!isNewProject && activeTab === 'parts' && (
              <PartsList 
                loading={loading}
                projectItems={projectItems}
                handleExportCuttingList={handleExportCuttingList}
              />
            )}
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

export default CabinetProjectModal;