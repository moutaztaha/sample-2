import React from 'react';
import { DollarSign, Package } from 'lucide-react';

interface CalculationSummaryProps {
  calculationResult: any;
}

const CalculationSummary: React.FC<CalculationSummaryProps> = ({ calculationResult }) => {
  return (
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
  );
};

export default CalculationSummary;