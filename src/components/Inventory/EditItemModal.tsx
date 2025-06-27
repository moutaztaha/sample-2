import React, { useState, useEffect } from 'react';
import { X, Package, Save, Image, Upload } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemUpdated: () => void;
  itemId: number | null;
}

interface DropdownData {
  categories: Array<{ id: number; name: string }>;
  subcategories: Array<{ id: number; name: string; category_id: number }>;
  units: Array<{ id: number; name: string; abbreviation: string }>;
  locations: Array<{ id: number; name: string }>;
  suppliers: Array<{ id: number; name: string }>;
}

const EditItemModal: React.FC<EditItemModalProps> = ({ isOpen, onClose, onItemUpdated, itemId }) => {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category_id: '',
    subcategory_id: '',
    unit_id: '',
    location_id: '',
    supplier_id: '',
    quantity: 0,
    min_quantity: 0,
    max_quantity: 1000,
    unit_price: 0,
    item_type: 'raw_material',
    image_url: ''
  });

  const [dropdownData, setDropdownData] = useState<DropdownData>({
    categories: [],
    subcategories: [],
    units: [],
    locations: [],
    suppliers: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (isOpen && itemId) {
      loadItemData();
      loadDropdownData();
    }
  }, [isOpen, itemId]);

  const loadItemData = async () => {
    if (!itemId) return;
    
    try {
      const item = await inventoryService.getItem(itemId);
      setFormData({
        name: item.name || '',
        sku: item.sku || '',
        description: item.description || '',
        category_id: item.category_id?.toString() || '',
        subcategory_id: item.subcategory_id?.toString() || '',
        unit_id: item.unit_id?.toString() || '',
        location_id: item.location_id?.toString() || '',
        supplier_id: item.supplier_id?.toString() || '',
        quantity: item.quantity || 0,
        min_quantity: item.min_quantity || 0,
        max_quantity: item.max_quantity || 1000,
        unit_price: item.unit_price || 0,
        item_type: item.item_type || 'raw_material',
        image_url: item.image_url || ''
      });
      
      // Set image preview if there's an image URL
      if (item.image_url) {
        setImagePreviewUrl(item.image_url);
      } else {
        setImagePreviewUrl('');
      }
    } catch (error) {
      console.error('Error loading item:', error);
      setError('Failed to load item data');
    }
  };

  const loadDropdownData = async () => {
    try {
      const data = await inventoryService.getDropdownData();
      setDropdownData(data);
    } catch (error) {
      console.error('Error loading dropdown data:', error);
      setError('Failed to load form data');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId) return;

    setLoading(true);
    setError('');
    setUploadError('');

    try {
      // If there's an image file, upload it first
      let finalImageUrl = formData.image_url;
      if (imageFile) {
        try {
          setUploadingImage(true);
          const imageData = await inventoryService.uploadImage(imageFile);
          if (imageData && imageData.imageUrl) {
            finalImageUrl = imageData.imageUrl;
            console.log("Image uploaded successfully:", finalImageUrl);
          } else {
            throw new Error("Failed to get image URL from server");
          }
        } catch (error) {
          console.error("Image upload error:", error);
          setUploadError('Failed to upload image. Please try again.');
          setLoading(false);
          setUploadingImage(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      await inventoryService.updateItem(itemId, {
        ...formData,
        image_url: finalImageUrl,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        subcategory_id: formData.subcategory_id ? parseInt(formData.subcategory_id) : null,
        unit_id: formData.unit_id ? parseInt(formData.unit_id) : null,
        location_id: formData.location_id ? parseInt(formData.location_id) : null,
        supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
      });

      onItemUpdated();
      onClose();
    } catch (error) {
      console.error("Update error:", error);
      setError(error instanceof Error ? error.message : 'Failed to update item');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('quantity') || name === 'unit_price' ? parseFloat(value) || 0 : value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset any previous errors
    setUploadError('');

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image file is too large. Maximum size is 5MB.');
      return;
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Only image files (JPEG, PNG, GIF, WEBP) are allowed.');
      return;
    }

    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setFormData(prev => ({ ...prev, image_url: '' })); // Clear URL input when file is selected
  };

  const filteredSubcategories = dropdownData.subcategories.filter(
    sub => !formData.category_id || sub.category_id === parseInt(formData.category_id)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-h-[90vh] max-w-4xl flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <Package className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Edit Item</h2>
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

            {uploadError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {uploadError}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter item name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SKU *
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter SKU"
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
                    Item Type *
                  </label>
                  <select
                    name="item_type"
                    value={formData.item_type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="raw_material">Raw Material</option>
                    <option value="semi_finished_product">Semi-Finished Product</option>
                    <option value="finished_product">Finished Product</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Image
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center">
                        <label className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <Upload className="h-5 w-5 mr-2 text-gray-500" />
                          <span className="text-sm text-gray-700">Upload Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Max size: 5MB. Formats: JPG, PNG, GIF, WEBP
                      </p>
                    </div>
                    
                    <div>
                      {(imagePreviewUrl || formData.image_url) && (
                        <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
                          <div className="relative h-32 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                            <img 
                              src={imagePreviewUrl || formData.image_url} 
                              alt="Item preview" 
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Invalid+Image';
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Categories and Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Categories & Details</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Category</option>
                    {dropdownData.categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subcategory
                  </label>
                  <select
                    name="subcategory_id"
                    value={formData.subcategory_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!formData.category_id}
                  >
                    <option value="">Select Subcategory</option>
                    {filteredSubcategories.map(subcategory => (
                      <option key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit
                  </label>
                  <select
                    name="unit_id"
                    value={formData.unit_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Unit</option>
                    {dropdownData.units.map(unit => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} ({unit.abbreviation})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <select
                    name="location_id"
                    value={formData.location_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Location</option>
                    {dropdownData.locations.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier
                  </label>
                  <select
                    name="supplier_id"
                    value={formData.supplier_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Supplier</option>
                    {dropdownData.suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Quantity and Pricing */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quantity & Pricing</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Quantity
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Quantity
                  </label>
                  <input
                    type="number"
                    name="min_quantity"
                    value={formData.min_quantity}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Quantity
                  </label>
                  <input
                    type="number"
                    name="max_quantity"
                    value={formData.max_quantity}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit Price ($)
                  </label>
                  <input
                    type="number"
                    name="unit_price"
                    value={formData.unit_price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
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
            disabled={loading || uploadingImage}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading || uploadingImage ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Updating...' : uploadingImage ? 'Uploading Image...' : 'Update Item'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditItemModal;