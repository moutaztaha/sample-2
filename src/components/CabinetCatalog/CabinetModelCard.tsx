import React from 'react';
import { Package, Ruler } from 'lucide-react';

interface CabinetModelCardProps {
  model: any;
  onConfigure: () => void;
}

const CabinetModelCard: React.FC<CabinetModelCardProps> = ({ model, onConfigure }) => {
  // Use a default image if none provided
  const imageUrl = model.image_url || 'https://placehold.co/300x200?text=No+Image';

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative h-48 bg-gray-100">
        <img 
          src={imageUrl} 
          alt={model.name} 
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null; // Prevent infinite loop
            target.src = 'https://placehold.co/300x200?text=No+Image';
          }}
        />
        <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
          {model.category_name}
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900">{model.name}</h3>
        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{model.description}</p>
        
        <div className="mt-4 space-y-2">
          <div className="flex items-center text-sm text-gray-700">
            <Ruler className="h-4 w-4 text-gray-400 mr-2" />
            <span>
              {model.default_width} × {model.default_height} × {model.default_depth} mm
            </span>
          </div>
          
          <div className="flex items-center text-sm text-gray-700">
            <Package className="h-4 w-4 text-gray-400 mr-2" />
            <span>
              Width: {model.min_width} - {model.max_width} mm
            </span>
          </div>
        </div>
        
        <button
          onClick={onConfigure}
          className="mt-4 w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Configure & Price
        </button>
      </div>
    </div>
  );
};

export default CabinetModelCard;
