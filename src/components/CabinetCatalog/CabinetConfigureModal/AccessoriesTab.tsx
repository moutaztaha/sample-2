import React from 'react';

interface AccessoriesTabProps {
  modelAccessories: any[];
  handleAccessoryChange: (accessoryIndex: number, field: string, value: any) => void;
}

const AccessoriesTab: React.FC<AccessoriesTabProps> = ({ 
  modelAccessories, 
  handleAccessoryChange 
}) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Cabinet Accessories</h3>
      
      {modelAccessories.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No accessories defined for this cabinet model</p>
      ) : (
        <div className="space-y-4">
          {modelAccessories.map((accessory, index) => (
            <div key={index} className="border border-gray-200 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-900">{accessory.accessory_name}</h4>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                  {accessory.accessory_type}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity Formula
                  </label>
                  <input
                    type="text"
                    value={accessory.quantity_formula || accessory.default_quantity_formula}
                    onChange={(e) => handleAccessoryChange(index, 'quantity_formula', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Cost
                  </label>
                  <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm">
                    ${accessory.unit_cost?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>
              
              <div className="mt-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={accessory.is_required}
                    onChange={(e) => handleAccessoryChange(index, 'is_required', e.target.checked)}
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-sm text-gray-700">Required</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AccessoriesTab;