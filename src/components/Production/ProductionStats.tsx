import React from 'react';
import { 
  Factory, 
  Play, 
  CheckCircle, 
  DollarSign 
} from 'lucide-react';

interface ProductionStatsProps {
  stats: {
    total_orders: number;
    in_progress_count: number;
    completed_count: number;
    total_planned_cost: number;
  };
}

const ProductionStats: React.FC<ProductionStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center">
          <Factory className="w-8 h-8 text-blue-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_orders}</p>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center">
          <Play className="w-8 h-8 text-blue-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">In Progress</p>
            <p className="text-2xl font-bold text-gray-900">{stats.in_progress_count}</p>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-gray-900">{stats.completed_count}</p>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center">
          <DollarSign className="w-8 h-8 text-purple-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Cost</p>
            <p className="text-2xl font-bold text-gray-900">
              ${stats.total_planned_cost ? stats.total_planned_cost.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0.00'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionStats;