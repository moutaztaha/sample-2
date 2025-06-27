import React, { useState, useEffect } from 'react';
import { X, Save, Package, Ruler, DollarSign, Plus, Minus, Trash2, Download, Scissors } from 'lucide-react';
import { cabinetService } from '../../services/cabinetService';

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
            <Package className="h-6 w-6 text-blue-600 mr-3" />
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
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Project Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter project name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter project description"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="draft">Draft</option>
                        <option value="quoted">Quoted</option>
                        <option value="approved">Approved</option>
                        <option value="in_production">In Production</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer Name
                      </label>
                      <input
                        type="text"
                        name="customer_name"
                        value={formData.customer_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter customer name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer Email
                      </label>
                      <input
                        type="email"
                        name="customer_email"
                        value={formData.customer_email}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter customer email"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer Phone
                      </label>
                      <input
                        type="tel"
                        name="customer_phone"
                        value={formData.customer_phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter customer phone"
                      />
                    </div>
                  </div>
                </div>
                
                {!isNewProject && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium text-blue-900">Project Summary</h3>
                        <p className="text-sm text-blue-700">
                          {projectItems.length} cabinets | Total Cost: ${project.total_cost?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={handleExportCostEstimate}
                          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Cost Estimate
                        </button>
                        <button
                          type="button"
                          onClick={handleExportCuttingList}
                          className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Cutting List
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {loading ? 'Saving...' : (isNewProject ? 'Create Project' : 'Update Project')}
                  </button>
                </div>
              </form>
            )}

            {/* Cabinets Tab */}
            {!isNewProject && activeTab === 'cabinets' && (
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
                        <Package className="mx-auto h-12 w-12 text-gray-400" />
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
                                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=No+Image';
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
            )}

            {/* Parts List Tab */}
            {!isNewProject && activeTab === 'parts' && (
              <div className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium text-gray-900">Parts List</h3>
                      <button
                        onClick={handleExportCuttingList}
                        className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Scissors className="h-4 w-4 mr-2" />
                        Generate Cutting List
                      </button>
                    </div>
                    
                    {projectItems.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No cabinets in this project</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Add cabinets from the catalog to see parts list.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Parts List */}
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cabinet</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dimensions (mm)</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grain</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Edges</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {projectItems.flatMap(item => 
                                (item.parts || []).map((part: any, partIndex: number) => (
                                  <tr key={`${item.id}-${partIndex}`} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{part.name}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                      {part.material_name || 'N/A'}
                                      {part.material_color && ` (${part.material_color})`}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                      {part.part_type === 'hardware' 
                                        ? 'N/A' 
                                        : `${part.width} × ${part.height} × ${part.thickness}`}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                      {part.grain_direction === 'with_grain' ? 'With' : 
                                       part.grain_direction === 'against_grain' ? 'Against' : 'None'}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                      {[
                                        part.edge_banding_top ? 'T' : '',
                                        part.edge_banding_bottom ? 'B' : '',
                                        part.edge_banding_left ? 'L' : '',
                                        part.edge_banding_right ? 'R' : ''
                                      ].filter(Boolean).join(', ') || 'None'}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{part.quantity}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">${part.total_cost.toFixed(2)}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Summary */}
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="text-lg font-medium text-blue-900">Parts Summary</h3>
                              <p className="text-sm text-blue-700">
                                {projectItems.reduce((sum, item) => sum + (item.parts?.length || 0), 0)} total parts
                              </p>
                            </div>
                            <div>
                              <button
                                onClick={handleExportCuttingList}
                                className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Export Cutting List
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
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