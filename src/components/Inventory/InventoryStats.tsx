import React from 'react';
import { Package, AlertTriangle } from 'lucide-react';

interface InventoryStatsProps {
  totalItems: number;
  inStockItems: number;
  lowStockItems: number;
  outOfStockItems: number;
}

const InventoryStats: React.FC<InventoryStatsProps> = ({
  totalItems,
  inStockItems,
  lowStockItems,
  outOfStockItems
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center">
          <Package className="w-8 h-8 text-blue-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total Items</p>
            <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-green-600 rounded-full"></div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">In Stock</p>
            <p className="text-2xl font-bold text-gray-900">{inStockItems}</p>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Low Stock</p>
            <p className="text-2xl font-bold text-gray-900">{lowStockItems}</p>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-red-600 rounded-full"></div>
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Out of Stock</p>
            <p className="text-2xl font-bold text-gray-900">{outOfStockItems}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryStats;