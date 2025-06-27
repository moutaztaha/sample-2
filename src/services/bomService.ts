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

export const bomService = {
  async getBOMs(params: any = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${API_BASE}/boms?${queryString}`, {
        headers: getAuthHeaders(),
      });

      const result = await handleResponse(response);
      return {
        boms: Array.isArray(result?.boms) ? result.boms : [],
        pagination: result?.pagination || { page: 1, limit: 50, total: 0, pages: 0 }
      };
    } catch (error) {
      console.error('Error fetching BOMs:', error);
      return {
        boms: [],
        pagination: { page: 1, limit: 50, total: 0, pages: 0 }
      };
    }
  },

  async getBOM(id: number) {
    try {
      const response = await fetch(`${API_BASE}/boms/${id}`, {
        headers: getAuthHeaders(),
      });

      const result = await handleResponse(response);
      // Ensure components and operations are always arrays
      if (result) {
        result.components = Array.isArray(result.components) ? result.components : [];
        result.operations = Array.isArray(result.operations) ? result.operations : [];
      }
      return result;
    } catch (error) {
      console.error('Error fetching BOM:', error);
      return { components: [], operations: [] };
    }
  },

  async createBOM(bom: any) {
    const response = await fetch(`${API_BASE}/boms`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(bom),
    });

    return handleResponse(response);
  },

  async updateBOM(id: number, bom: any) {
    const response = await fetch(`${API_BASE}/boms/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(bom),
    });

    return handleResponse(response);
  },

  async deleteBOM(id: number) {
    const response = await fetch(`${API_BASE}/boms/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },

  async getBOMDropdownList() {
    try {
      const response = await fetch(`${API_BASE}/boms/dropdown/list`, {
        headers: getAuthHeaders(),
      });

      const result = await handleResponse(response);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching BOM dropdown list:', error);
      return [];
    }
  }
};