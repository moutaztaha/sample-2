import React from 'react';
import { Plus, Layers } from 'lucide-react';

interface ProjectSelectorProps {
  projects: any[];
  selectedProject: string;
  setSelectedProject: (projectId: string) => void;
  showCreateProject: boolean;
  setShowCreateProject: (show: boolean) => void;
  newProjectName: string;
  setNewProjectName: (name: string) => void;
  handleCreateProject: () => void;
  handleAddToProject: () => void;
  loading: boolean;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  selectedProject,
  setSelectedProject,
  showCreateProject,
  setShowCreateProject,
  newProjectName,
  setNewProjectName,
  handleCreateProject,
  handleAddToProject,
  loading
}) => {
  return (
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
  );
};

export default ProjectSelector;