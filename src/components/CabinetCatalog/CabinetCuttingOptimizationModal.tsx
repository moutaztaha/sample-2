import React, { useState, useEffect } from 'react';
import { X, Download, Scissors, Layers, Package } from 'lucide-react';
import { cabinetService } from '../../services/cabinetService';

interface CabinetCuttingOptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
}

const CabinetCuttingOptimizationModal: React.FC<CabinetCuttingOptimizationModalProps> = ({ 
  isOpen, 
  onClose, 
  project 
}) => {
  const [optimization, setOptimization] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && project) {
      generateCuttingOptimization();
    }
  }, [isOpen, project]);

  const generateCuttingOptimization = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await cabinetService.generateCuttingOptimization(project.id);
      setOptimization(result);
      
      // Select first material by default
      if (result && result.optimization) {
        const materialIds = Object.keys(result.optimization);
        if (materialIds.length > 0) {
          setSelectedMaterial(materialIds[0]);
        }
      }
    } catch (error) {
      console.error('Error generating cutting optimization:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate cutting optimization');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCuttingList = () => {
    // This would generate and download a cutting list
    console.log('Export cutting list for project:', project.id);
  };

  const renderSheetLayout = (sheet: any, materialName: string, sheetIndex: number) => {
    const { width, height, parts } = sheet;
    
    // Calculate scale to fit in the container
    const containerWidth = 400; // max width in pixels
    const containerHeight = 300; // max height in pixels
    
    const scaleX = containerWidth / width;
    const scaleY = containerHeight / height;
    const scale = Math.min(scaleX, scaleY);
    
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    
    return (
      <div key={sheetIndex} className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          Sheet {sheetIndex + 1} - {materialName} ({width}mm × {height}mm)
        </h4>
        <div 
          className="border border-gray-300 bg-gray-50 relative"
          style={{ width: `${scaledWidth}px`, height: `${scaledHeight}px` }}
        >
          {/* Sheet outline */}
          <div className="absolute inset-0 border border-gray-400"></div>
          
          {/* Parts */}
          {parts.map((part: any, partIndex: number) => {
            const partStyle = {
              left: `${part.x * scale}px`,
              top: `${part.y * scale}px`,
              width: `${part.width * scale}px`,
              height: `${part.height * scale}px`,
              backgroundColor: getPartColor(part.part_type),
              border: '1px solid #666',
              position: 'absolute' as 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              overflow: 'hidden',
              whiteSpace: 'nowrap' as 'nowrap',
              textOverflow: 'ellipsis'
            };
            
            return (
              <div key={partIndex} style={partStyle} title={`${part.name} (${part.width}×${part.height}mm)`}>
                {part.width * scale > 40 && part.height * scale > 20 ? part.name : ''}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getPartColor = (partType: string) => {
    switch (partType) {
      case 'side_panel': return 'rgba(59, 130, 246, 0.3)'; // blue
      case 'horizontal_panel': return 'rgba(16, 185, 129, 0.3)'; // green
      case 'back_panel': return 'rgba(245, 158, 11, 0.3)'; // amber
      case 'shelf': return 'rgba(139, 92, 246, 0.3)'; // purple
      case 'door': return 'rgba(239, 68, 68, 0.3)'; // red
      default: return 'rgba(209, 213, 219, 0.3)'; // gray
    }
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-6xl flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <Scissors className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Cutting Optimization</h2>
              <p className="text-sm text-gray-600">{project.name}</p>
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

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : optimization ? (
              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-blue-900 mb-2">Optimization Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Total Materials:</span>
                      <span className="ml-2 font-medium">{optimization.materials_count}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Total Parts:</span>
                      <span className="ml-2 font-medium">{optimization.total_parts}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Total Sheets:</span>
                      <span className="ml-2 font-medium">
                        {Object.values(optimization.optimization).reduce((sum: number, material: any) => sum + material.sheets_count, 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Material Selector */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Material
                  </label>
                  <select
                    value={selectedMaterial || ''}
                    onChange={(e) => setSelectedMaterial(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.entries(optimization.optimization).map(([materialId, material]: [string, any]) => (
                      <option key={materialId} value={materialId}>
                        {material.material_name} - {material.sheets_count} sheets
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cutting Layout */}
                {selectedMaterial && (
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        Cutting Layout - {optimization.optimization[selectedMaterial].material_name}
                      </h3>
                      <button
                        onClick={handleExportCuttingList}
                        className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Cutting List
                      </button>
                    </div>
                    
                    <div className="space-y-6">
                      {optimization.optimization[selectedMaterial].sheets.map((sheet: any, index: number) => 
                        renderSheetLayout(sheet, optimization.optimization[selectedMaterial].material_name, index)
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <Scissors className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No cutting optimization available</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add cabinets to the project to generate a cutting optimization.
                </p>
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

export default CabinetCuttingOptimizationModal;