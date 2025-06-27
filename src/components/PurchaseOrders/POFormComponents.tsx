import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

// Basic Form Fields Component
export const POFormFields: React.FC<{
  formData: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  suppliers: any[];
}> = ({ formData, handleInputChange, suppliers }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Title *
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter PO title"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Supplier *
        </label>
        <select
          name="supplier_id"
          value={formData.supplier_id}
          onChange={handleInputChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select Supplier</option>
          {suppliers.map(supplier => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
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
    </div>

    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Details</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Priority
        </label>
        <select
          name="priority"
          value={formData.priority}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Order Date
        </label>
        <input
          type="date"
          name="order_date"
          value={formData.order_date}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Expected Delivery Date
        </label>
        <input
          type="date"
          name="expected_delivery_date"
          value={formData.expected_delivery_date}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Terms
        </label>
        <input
          type="text"
          name="payment_terms"
          value={formData.payment_terms}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., Net 30, COD"
        />
      </div>
    </div>
  </div>
);

// Items Section Component
export const POItemsSection: React.FC<{
  items: any[];
  inventoryItems: any[];
  handleItemChange: (index: number, field: string, value: any) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  getTotalAmount: () => number;
}> = ({ items, inventoryItems, handleItemChange, addItem, removeItem, getTotalAmount }) => (
  <div>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-medium text-gray-900">Items</h3>
      <button
        type="button"
        onClick={addItem}
        className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Item
      </button>
    </div>

    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item *
              </label>
              <select
                value={item.item_id}
                onChange={(e) => handleItemChange(index, 'item_id', parseInt(e.target.value))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={0}>Select Item</option>
                {inventoryItems.map(invItem => (
                  <option key={invItem.id} value={invItem.id}>
                    {invItem.name} ({invItem.sku})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                min="1"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit Price ($) *
              </label>
              <input
                type="number"
                value={item.unit_price}
                onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total
              </label>
              <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm">
                ${(item.quantity * item.unit_price).toFixed(2)}
              </div>
            </div>

            <div className="flex items-end">
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="w-full px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4 mx-auto" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <input
              type="text"
              value={item.notes}
              onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional notes for this item"
            />
          </div>
        </div>
      ))}
    </div>

    {/* Total Amount */}
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex justify-between items-center">
        <span className="text-lg font-medium text-gray-900">Total Amount (incl. 10% tax):</span>
        <span className="text-xl font-bold text-blue-600">${getTotalAmount().toFixed(2)}</span>
      </div>
    </div>
  </div>
);