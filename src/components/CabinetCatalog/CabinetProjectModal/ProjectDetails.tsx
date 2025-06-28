import React from 'react';
import { Download } from 'lucide-react';

interface ProjectDetailsProps {
  formData: {
    name: string;
    description: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    status: string;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isNewProject: boolean;
  project: any;
  handleExportCostEstimate: () => void;
  handleExportCuttingList: () => void;
  loading: boolean;
}

const ProjectDetails: React.FC<ProjectDetailsProps> = ({
  formData,
  handleInputChange,
  handleSubmit,
  isNewProject,
  project,
  handleExportCostEstimate,
  handleExportCuttingList,
  loading
}) => {
  return (
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
                {project.item_count} cabinets | Total Cost: ${project.total_cost?.toFixed(2) || '0.00'}
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
          ) : null}
          {loading ? 'Saving...' : (isNewProject ? 'Create Project' : 'Update Project')}
        </button>
      </div>
    </form>
  );
};

export default ProjectDetails;