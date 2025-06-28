import React from 'react';
import { Download, Scissors } from 'lucide-react';

interface PartsListProps {
  loading: boolean;
  projectItems: any[];
  handleExportCuttingList: () => void;
}

const PartsList: React.FC<PartsListProps> = ({
  loading,
  projectItems,
  handleExportCuttingList
}) => {
  return (
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
  );
};

export default PartsList;