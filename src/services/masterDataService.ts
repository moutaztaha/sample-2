const API_BASE = '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    let errorMessage = 'Request failed';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  // Always expect JSON for API responses
  const text = await response.text();
  if (text.trim() === '') {
    return {};
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Failed to parse JSON:', text);
    throw new Error('Invalid JSON response');
  }
};

export const masterDataService = {
  // Categories
  async getCategories() {
    const response = await fetch(`${API_BASE}/master-data/categories`, {
      headers: getAuthHeaders(),
    });

    const result = await handleResponse(response);
    return Array.isArray(result) ? result : [];
  },

  async createCategory(category: any) {
    const response = await fetch(`${API_BASE}/master-data/categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(category),
    });

    return handleResponse(response);
  },

  async updateCategory(id: number, category: any) {
    const response = await fetch(`${API_BASE}/master-data/categories/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(category),
    });

    return handleResponse(response);
  },

  async deleteCategory(id: number) {
    const response = await fetch(`${API_BASE}/master-data/categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },

  // Subcategories
  async getSubcategories() {
    const response = await fetch(`${API_BASE}/master-data/subcategories`, {
      headers: getAuthHeaders(),
    });

    const result = await handleResponse(response);
    return Array.isArray(result) ? result : [];
  },

  async createSubcategory(subcategory: any) {
    const response = await fetch(`${API_BASE}/master-data/subcategories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(subcategory),
    });

    return handleResponse(response);
  },

  async updateSubcategory(id: number, subcategory: any) {
    const response = await fetch(`${API_BASE}/master-data/subcategories/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(subcategory),
    });

    return handleResponse(response);
  },

  async deleteSubcategory(id: number) {
    const response = await fetch(`${API_BASE}/master-data/subcategories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },

  // Units
  async getUnits() {
    const response = await fetch(`${API_BASE}/master-data/units`, {
      headers: getAuthHeaders(),
    });

    const result = await handleResponse(response);
    return Array.isArray(result) ? result : [];
  },

  async createUnit(unit: any) {
    const response = await fetch(`${API_BASE}/master-data/units`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(unit),
    });

    return handleResponse(response);
  },

  async updateUnit(id: number, unit: any) {
    const response = await fetch(`${API_BASE}/master-data/units/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(unit),
    });

    return handleResponse(response);
  },

  async deleteUnit(id: number) {
    const response = await fetch(`${API_BASE}/master-data/units/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },

  // Locations
  async getLocations() {
    const response = await fetch(`${API_BASE}/master-data/locations`, {
      headers: getAuthHeaders(),
    });

    const result = await handleResponse(response);
    return Array.isArray(result) ? result : [];
  },

  async createLocation(location: any) {
    const response = await fetch(`${API_BASE}/master-data/locations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(location),
    });

    return handleResponse(response);
  },

  async updateLocation(id: number, location: any) {
    const response = await fetch(`${API_BASE}/master-data/locations/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(location),
    });

    return handleResponse(response);
  },

  async deleteLocation(id: number) {
    const response = await fetch(`${API_BASE}/master-data/locations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },

  // Suppliers
  async getSuppliers() {
    const response = await fetch(`${API_BASE}/master-data/suppliers`, {
      headers: getAuthHeaders(),
    });

    const result = await handleResponse(response);
    return Array.isArray(result) ? result : [];
  },

  async createSupplier(supplier: any) {
    const response = await fetch(`${API_BASE}/master-data/suppliers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(supplier),
    });

    return handleResponse(response);
  },

  async updateSupplier(id: number, supplier: any) {
    const response = await fetch(`${API_BASE}/master-data/suppliers/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(supplier),
    });

    return handleResponse(response);
  },

  async deleteSupplier(id: number) {
    const response = await fetch(`${API_BASE}/master-data/suppliers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },

  // Departments
  async getDepartments() {
    const response = await fetch(`${API_BASE}/master-data/departments`, {
      headers: getAuthHeaders(),
    });

    const result = await handleResponse(response);
    return Array.isArray(result) ? result : [];
  },

  async createDepartment(department: any) {
    const response = await fetch(`${API_BASE}/master-data/departments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(department),
    });

    return handleResponse(response);
  },

  async updateDepartment(id: number, department: any) {
    const response = await fetch(`${API_BASE}/master-data/departments/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(department),
    });

    return handleResponse(response);
  },

  async deleteDepartment(id: number) {
    const response = await fetch(`${API_BASE}/master-data/departments/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },
};