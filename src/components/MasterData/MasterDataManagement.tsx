import React, { useState } from 'react';
import { 
  Settings, 
  FolderTree, 
  Package, 
  MapPin, 
  Building2, 
  Ruler,
  Building
} from 'lucide-react';
import CategoriesTab from './CategoriesTab';
import SubcategoriesTab from './SubcategoriesTab';
import UnitsTab from './UnitsTab';
import LocationsTab from './LocationsTab';
import SuppliersTab from './SuppliersTab';
import DepartmentsTab from './DepartmentsTab';

const MasterDataManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('categories');

  const tabs = [
    { id: 'categories', name: 'Categories', icon: FolderTree },
    { id: 'subcategories', name: 'Subcategories', icon: Package },
    { id: 'units', name: 'Units', icon: Ruler },
    { id: 'locations', name: 'Locations', icon: MapPin },
    { id: 'suppliers', name: 'Suppliers', icon: Building2 },
    { id: 'departments', name: 'Departments', icon: Building }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'categories':
        return <CategoriesTab />;
      case 'subcategories':
        return <SubcategoriesTab />;
      case 'units':
        return <UnitsTab />;
      case 'locations':
        return <LocationsTab />;
      case 'suppliers':
        return <SuppliersTab />;
      case 'departments':
        return <DepartmentsTab />;
      default:
        return <CategoriesTab />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center">
            <Settings className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Master Data Management</h1>
              <p className="text-gray-600">Manage categories, units, locations, suppliers, and departments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default MasterDataManagement;