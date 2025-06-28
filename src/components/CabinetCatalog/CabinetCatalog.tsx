import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  RefreshCw, 
  Filter, 
  Layers
} from 'lucide-react';
import { cabinetService } from '../../services/cabinetService';
import CabinetModelCard from './CabinetModelCard';
import CabinetConfigureModal from './CabinetConfigureModal';
import CabinetProjectModal from './CabinetProjectModal';
import CabinetCuttingOptimizationModal from './CabinetCuttingOptimizationModal';

const CabinetCatalog: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [hardware, setHardware] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showConfigureModal, setShowConfigureModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showCuttingModal, setShowCuttingModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'projects'>('catalog');

  useEffect(() => {
    loadCabinetData();
  }, []);

  useEffect(() => {
    if (activeTab === 'catalog') {
      loadModels();
    } else if (activeTab === 'projects') {
      loadProjects();
    }
  }, [activeTab, selectedCategory, searchTerm]);

  const loadCabinetData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCategories(),
        loadMaterials(),
        loadHardware(),
        loadModels(),
        loadProjects()
      ]);
    } catch (error) {
      console.error('Error loading cabinet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await cabinetService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadModels = async () => {
    try {
      const params: any = {};
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      const data = await cabinetService.getModels(params);
      setModels(data);
    } catch (error) {
      console.error('Error loading models:', error);
    }
  };

  const loadMaterials = async () => {
    try {
      const data = await cabinetService.getMaterials();
      setMaterials(data);
    } catch (error) {
      console.error('Error loading materials:', error);
    }
  };

  const loadHardware = async () => {
    try {
      const data = await cabinetService.getHardware();
      setHardware(data);
    } catch (error) {
      console.error('Error loading hardware:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const data = await cabinetService.getProjects();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleConfigureCabinet = (model: any) => {
    setSelectedModel(model);
    setShowConfigureModal(true);
  };

  const handleCreateProject = () => {
    setSelectedProject(null);
    setShowProjectModal(true);
  };

  const handleViewProject = (project: any) => {
    setSelectedProject(project);
    setShowProjectModal(true);
  };

  const handleGenerateCuttingList = (project: any) => {
    setSelectedProject(project);
    setShowCuttingModal(true);
  };

  const handleModalClose = () => {
    setShowConfigureModal(false);
    setShowProjectModal(false);
    setShowCuttingModal(false);
    setSelectedModel(null);
    setSelectedProject(null);
  };

  const handleModalSuccess = () => {
    loadProjects();
    handleModalClose();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cabinet Catalog</h1>
          <p className="text-gray-600">Design and price custom cabinets</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadCabinetData}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          {activeTab === 'projects' && (
            <button
              onClick={handleCreateProject}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`${
                activeTab === 'catalog'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
            >
              <Package className="h-5 w-5 mr-2" />
              Cabinet Catalog
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`${
                activeTab === 'projects'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
            >
              <Layers className="h-5 w-5 mr-2" />
              Cabinet Projects
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'catalog' ? (
            <>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search cabinets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="sm:w-48">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cabinet Models Grid */}
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {models.map(model => (
                    <CabinetModelCard
                      key={model.id}
                      model={model}
                      onConfigure={() => handleConfigureCabinet(model)}
                    />
                  ))}
                </div>
              )}

              {models.length === 0 && !loading && (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No cabinet models found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || selectedCategory !== 'all' 
                      ? 'Try adjusting your search or filter criteria.'
                      : 'Cabinet models will appear here once added to the system.'
                    }
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Projects List */}
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map(project => (
                    <div key={project.id} className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                          <p className="text-sm text-gray-600">{project.description}</p>
                          <div className="mt-2 flex items-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              project.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                              project.status === 'quoted' ? 'bg-blue-100 text-blue-800' :
                              project.status === 'approved' ? 'bg-green-100 text-green-800' :
                              project.status === 'in_production' ? 'bg-yellow-100 text-yellow-800' :
                              project.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                            </span>
                            <span className="ml-4 text-sm text-gray-500">
                              {project.item_count} {project.item_count === 1 ? 'cabinet' : 'cabinets'}
                            </span>
                            <span className="ml-4 flex items-center text-sm font-medium text-green-600">
                              ${project.total_cost.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
                          <button
                            onClick={() => handleViewProject(project)}
                            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => handleGenerateCuttingList(project)}
                            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Cutting List
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {projects.length === 0 && !loading && (
                <div className="text-center py-12">
                  <Layers className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No cabinet projects found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating your first cabinet project.
                  </p>
                  <button
                    onClick={handleCreateProject}
                    className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Project
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <CabinetConfigureModal
        isOpen={showConfigureModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        model={selectedModel}
        materials={materials}
        hardware={hardware}
      />

      <CabinetProjectModal
        isOpen={showProjectModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        project={selectedProject}
        models={models}
        materials={materials}
        hardware={hardware}
      />

      <CabinetCuttingOptimizationModal
        isOpen={showCuttingModal}
        onClose={handleModalClose}
        project={selectedProject}
      />
    </div>
  );
};

export default CabinetCatalog;