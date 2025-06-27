import React, { useState, useEffect } from 'react';
import { X, FileText, Save, Plus, Trash2, Package, PenTool as Tool, Layers } from 'lucide-react';
import { bomService } from '../../services/bomService';
import { inventoryService } from '../../services/inventoryService';

interface BOMModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bom?: any;
}

const BOMModal: React.FC<BOMModalProps> = ({ isOpen, onClose, onSuccess, bom }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    finished_product_id: '',
    version: '1.0',
    status: 'draft',
    overhead_cost: 0
  });

  const [components, setComponents] = useState<any[]>([
    { 
      component_type: 'item', // 'item' or 'bom'
      item_id: '', 
      component_bom_id: '',
      quantity: 1, 
      unit_id: '', 
      waste_factor: 0, 
      notes: '' 
    }
  ]);

  const [operations, setOperations] = useState<any[]>([
    { operation_name: '', description: '', estimated_time_minutes: 30, labor_rate: 25, machine_required: '', skill_level: 'basic', notes: '' }
  ]);

  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [bomsList, setBomsList] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadDropdownData();
      if (bom) {
        loadBOMDetails();
      } else {
        resetForm();
      }
    }
  }, [isOpen, bom]);

  const loadDropdownData = async () => {
    try {
      const dropdownData = await inventoryService.getDropdownData();
      const inventoryResponse = await inventoryService.getItems({ limit: 1000 });
      const bomsResponse = await bomService.getBOMs({ limit: 1000 });
      
      setInventoryItems(inventoryResponse.items || []);
      setBomsList(bomsResponse.boms || []);
      setUnits(dropdownData.units || []);
    } catch (error) {
      console.error('Error loading dropdown data:', error);
      setError('Failed to load form data');
    }
  };

  const loadBOMDetails = async () => {
    if (!bom) return;
    
    try {
      setLoading(true);
      const bomDetails = await bomService.getBOM(bom.id);
      
      setFormData({
        name: bomDetails.name || '',
        description: bomDetails.description || '',
        finished_product_id: bomDetails.finished_product_id?.toString() || '',
        version: bomDetails.version || '1.0',
        status: bomDetails.status || 'draft',
        overhead_cost: bomDetails.overhead_cost || 0
      });

      if (bomDetails.components && bomDetails.components.length > 0) {
        setComponents(bomDetails.components.map((comp: any) => {
          const componentType = comp.component_type || (comp.item_id ? 'item' : 'bom');
          return {
            component_type: componentType,
            item_id: comp.item_id || '',
            component_bom_id: comp.component_bom_id || '',
            quantity: comp.quantity,
            unit_id: comp.unit_id,
            waste_factor: comp.waste_factor || 0,
            notes: comp.notes || ''
          };
        }));
      } else {
        setComponents([{ 
          component_type: 'item',
          item_id: '', 
          component_bom_id: '',
          quantity: 1, 
          unit_id: '', 
          waste_factor: 0, 
          notes: '' 
        }]);
      }

      if (bomDetails.operations && bomDetails.operations.length > 0) {
        setOperations(bomDetails.operations.map((op: any) => ({
          operation_name: op.operation_name,
          description: op.description || '',
          estimated_time_minutes: op.estimated_time_minutes || 30,
          labor_rate: op.labor_rate || 25,
          machine_required: op.machine_required || '',
          skill_level: op.skill_level || 'basic',
          notes: op.notes || ''
        })));
      } else {
        setOperations([{ operation_name: '', description: '', estimated_time_minutes: 30, labor_rate: 25, machine_required: '', skill_level: 'basic', notes: '' }]);
      }
    } catch (error) {
      console.error('Error loading BOM details:', error);
      setError('Failed to load BOM details');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      finished_product_id: '',
      version: '1.0',
      status: 'draft',
      overhead_cost: 0
    });
    setComponents([{ 
      component_type: 'item',
      item_id: '', 
      component_bom_id: '',
      quantity: 1, 
      unit_id: '', 
      waste_factor: 0, 
      notes: '' 
    }]);
    setOperations([{ operation_name: '', description: '', estimated_time_minutes: 30, labor_rate: 25, machine_required: '', skill_level: 'basic', notes: '' }]);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate components
      const validComponents = components.filter(comp => {
        if (comp.component_type === 'item') {
          return comp.item_id && comp.quantity > 0;
        } else if (comp.component_type === 'bom') {
          return comp.component_bom_id && comp.quantity > 0;
        }
        return false;
      });
      
      if (validComponents.length === 0) {
        setError('Please add at least one component to the BOM');
        setLoading(false);
        return;
      }

      // Validate operations
      const validOperations = operations.filter(op => op.operation_name);
      if (validOperations.length === 0) {
        setError('Please add at least one operation to the BOM');
        setLoading(false);
        return;
      }

      // Check for circular references in sub-BOMs
      if (bom) {
        const bomId = bom.id;
        for (const comp of validComponents) {
          if (comp.component_type === 'bom' && comp.component_bom_id === bomId) {
            setError('A BOM cannot reference itself as a component');
            setLoading(false);
            return;
          }
        }
      }

      // Prepare components data
      const preparedComponents = validComponents.map(comp => {
        const prepared: any = {
          quantity: parseFloat(comp.quantity.toString()),
          unit_id: comp.unit_id ? parseInt(comp.unit_id.toString()) : null,
          waste_factor: parseFloat(comp.waste_factor.toString()),
          notes: comp.notes
        };

        if (comp.component_type === 'item') {
          prepared.item_id = parseInt(comp.item_id.toString());
        } else if (comp.component_type === 'bom') {
          prepared.component_bom_id = parseInt(comp.component_bom_id.toString());
        }

        return prepared;
      });

      const bomData = {
        ...formData,
        finished_product_id: formData.finished_product_id ? parseInt(formData.finished_product_id.toString()) : null,
        overhead_cost: parseFloat(formData.overhead_cost.toString()),
        components: preparedComponents,
        operations: validOperations.map(op => ({
          ...op,
          estimated_time_minutes: parseInt(op.estimated_time_minutes.toString()),
          labor_rate: parseFloat(op.labor_rate.toString())
        }))
      };

      if (bom) {
        await bomService.updateBOM(bom.id, bomData);
      } else {
        await bomService.createBOM(bomData);
      }

      onSuccess();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save BOM');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleComponentTypeChange = (index: number, type: 'item' | 'bom') => {
    setComponents(prev => prev.map((comp, i) => {
      if (i === index) {
        return { 
          ...comp, 
          component_type: type,
          // Clear the other ID field
          item_id: type === 'item' ? comp.item_id : '',
          component_bom_id: type === 'bom' ? comp.component_bom_id : ''
        };
      }
      return comp;
    }));
  };

  const handleComponentChange = (index: number, field: string, value: any) => {
    setComponents(prev => prev.map((comp, i) => {
      if (i === index) {
        return { ...comp, [field]: value };
      }
      return comp;
    }));
  };

  const handleOperationChange = (index: number, field: string, value: any) => {
    setOperations(prev => prev.map((op, i) => {
      if (i === index) {
        return { ...op, [field]: value };
      }
      return op;
    }));
  };

  const addComponent = () => {
    setComponents(prev => [...prev, { 
      component_type: 'item',
      item_id: '', 
      component_bom_id: '',
      quantity: 1, 
      unit_id: '', 
      waste_factor: 0, 
      notes: '' 
    }]);
  };

  const removeComponent = (index: number) => {
    if (components.length > 1) {
      setComponents(prev => prev.filter((_, i) => i !== index));
    }
  };

  const addOperation = () => {
    setOperations(prev => [...prev, { operation_name: '', description: '', estimated_time_minutes: 30, labor_rate: 25, machine_required: '', skill_level: 'basic', notes: '' }]);
  };

  const removeOperation = (index: number) => {
    if (operations.length > 1) {
      setOperations(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Calculate estimated costs
  const calculateComponentCost = (component: any) => {
    if (component.component_type === 'item') {
      const item = inventoryItems.find(i => i.id.toString() === component.item_id.toString());
      const unitPrice = item ? item.unit_price : 0;
      const quantity = parseFloat(component.quantity) || 0;
      const wasteFactor = parseFloat(component.waste_factor) || 0;
      return unitPrice * quantity * (1 + wasteFactor);
    } else if (component.component_type === 'bom') {
      const subBom = bomsList.find(b => b.id.toString() === component.component_bom_id.toString());
      const unitCost = subBom ? subBom.total_cost : 0;
      const quantity = parseFloat(component.quantity) || 0;
      const wasteFactor = parseFloat(component.waste_factor) || 0;
      return unitCost * quantity * (1 + wasteFactor);
    }
    return 0;
  };

  const calculateTotalComponentCost = () => {
    return components.reduce((sum, comp) => sum + calculateComponentCost(comp), 0);
  };

  const calculateTotalLaborCost = () => {
    return operations.reduce((sum, op) => {
      const minutes = parseInt(op.estimated_time_minutes) || 0;
      const rate = parseFloat(op.labor_rate) || 0;
      return sum + (minutes / 60) * rate;
    }, 0);
  };

  const calculateTotalCost = () => {
    const materialCost = calculateTotalComponentCost();
    const laborCost = calculateTotalLaborCost();
    const overheadCost = parseFloat(formData.overhead_cost.toString()) || 0;
    return materialCost + laborCost + overheadCost;
  };

  // Filter out the current BOM from the dropdown to prevent circular references
  const filteredBomsList = bomsList.filter(b => !bom || b.id !== bom.id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-6xl flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <FileText className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">
              {bom ? 'Edit Bill of Materials' : 'Create Bill of Materials'}
            </h2>
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
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Basic Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    BOM Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter BOM name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Finished Product
                  </label>
                  <select
                    name="finished_product_id"
                    value={formData.finished_product_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Finished Product (Optional)</option>
                    {inventoryItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.sku})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Details</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Version
                  </label>
                  <input
                    type="text"
                    name="version"
                    value={formData.version}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 1.0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overhead Cost ($)
                  </label>
                  <input
                    type="number"
                    name="overhead_cost"
                    value={formData.overhead_cost}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Components Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Components</h3>
                <button
                  type="button"
                  onClick={addComponent}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Component
                </button>
              </div>

              <div className="space-y-4">
                {components.map((component, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        {component.component_type === 'item' ? (
                          <Package className="h-5 w-5 text-blue-500 mr-2" />
                        ) : (
                          <Layers className="h-5 w-5 text-purple-500 mr-2" />
                        )}
                        <span className="font-medium text-gray-900">
                          {component.component_type === 'item' ? 'Inventory Item' : 'Sub-Assembly (BOM)'}
                        </span>
                      </div>
                      {components.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeComponent(index)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Component Type Selection */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Component Type *
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleComponentTypeChange(index, 'item')}
                          className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-colors ${
                            component.component_type === 'item'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Package className="h-5 w-5 mr-2" />
                          Inventory Item
                        </button>
                        <button
                          type="button"
                          onClick={() => handleComponentTypeChange(index, 'bom')}
                          className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-colors ${
                            component.component_type === 'bom'
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Layers className="h-5 w-5 mr-2" />
                          Sub-Assembly (BOM)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {component.component_type === 'item' ? 'Item *' : 'Sub-Assembly (BOM) *'}
                        </label>
                        {component.component_type === 'item' ? (
                          <select
                            value={component.item_id}
                            onChange={(e) => handleComponentChange(index, 'item_id', e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select Item</option>
                            {inventoryItems.map(item => (
                              <option key={item.id} value={item.id}>
                                {item.name} ({item.sku})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select
                            value={component.component_bom_id}
                            onChange={(e) => handleComponentChange(index, 'component_bom_id', e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select BOM</option>
                            {filteredBomsList.map(subBom => (
                              <option key={subBom.id} value={subBom.id}>
                                {subBom.name} (v{subBom.version})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          value={component.quantity}
                          onChange={(e) => handleComponentChange(index, 'quantity', e.target.value)}
                          min="0.0001"
                          step="0.0001"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Unit
                        </label>
                        <select
                          value={component.unit_id}
                          onChange={(e) => handleComponentChange(index, 'unit_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select Unit</option>
                          {units.map(unit => (
                            <option key={unit.id} value={unit.id}>
                              {unit.name} ({unit.abbreviation})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Waste Factor (%)
                        </label>
                        <input
                          type="number"
                          value={component.waste_factor * 100}
                          onChange={(e) => handleComponentChange(index, 'waste_factor', parseFloat(e.target.value) / 100)}
                          min="0"
                          max="100"
                          step="0.1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Percentage of material wasted during production
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Estimated Cost
                        </label>
                        <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm">
                          ${calculateComponentCost(component).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={component.notes}
                        onChange={(e) => handleComponentChange(index, 'notes', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Optional notes for this component"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Operations Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Manufacturing Operations</h3>
                <button
                  type="button"
                  onClick={addOperation}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Operation
                </button>
              </div>

              <div className="space-y-4">
                {operations.map((operation, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <Tool className="h-5 w-5 text-purple-500 mr-2" />
                        <span className="font-medium text-gray-900">Operation {index + 1}</span>
                      </div>
                      {operations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOperation(index)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Operation Name *
                        </label>
                        <input
                          type="text"
                          value={operation.operation_name}
                          onChange={(e) => handleOperationChange(index, 'operation_name', e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., Cut, Drill, Sand, Assemble"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description
                        </label>
                        <input
                          type="text"
                          value={operation.description}
                          onChange={(e) => handleOperationChange(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Describe the operation"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Time (minutes)
                        </label>
                        <input
                          type="number"
                          value={operation.estimated_time_minutes}
                          onChange={(e) => handleOperationChange(index, 'estimated_time_minutes', e.target.value)}
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Labor Rate ($/hr)
                        </label>
                        <input
                          type="number"
                          value={operation.labor_rate}
                          onChange={(e) => handleOperationChange(index, 'labor_rate', e.target.value)}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Machine/Equipment
                        </label>
                        <input
                          type="text"
                          value={operation.machine_required}
                          onChange={(e) => handleOperationChange(index, 'machine_required', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., Table Saw, CNC Router"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Skill Level
                        </label>
                        <select
                          value={operation.skill_level}
                          onChange={(e) => handleOperationChange(index, 'skill_level', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="basic">Basic</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                          <option value="expert">Expert</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={operation.notes}
                        onChange={(e) => handleOperationChange(index, 'notes', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Optional notes for this operation"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Material Cost
                  </label>
                  <div className="px-3 py-2 bg-blue-50 rounded-lg text-sm font-medium text-blue-800">
                    ${calculateTotalComponentCost().toFixed(2)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Labor Cost
                  </label>
                  <div className="px-3 py-2 bg-green-50 rounded-lg text-sm font-medium text-green-800">
                    ${calculateTotalLaborCost().toFixed(2)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overhead Cost
                  </label>
                  <div className="px-3 py-2 bg-yellow-50 rounded-lg text-sm font-medium text-yellow-800">
                    ${parseFloat(formData.overhead_cost.toString()).toFixed(2)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Cost
                  </label>
                  <div className="px-3 py-2 bg-purple-50 rounded-lg text-sm font-medium text-purple-800">
                    ${calculateTotalCost().toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Add some bottom padding for mobile */}
            <div className="h-4 sm:hidden"></div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 p-4 sm:p-6 border-t border-gray-200 flex-shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Saving...' : (bom ? 'Update BOM' : 'Create BOM')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BOMModal;