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

export const cabinetService = {
  async getCategories() {
    try {
      const response = await fetch(`${API_BASE}/cabinet-catalog/categories`, {
        headers: getAuthHeaders(),
      });

      const result = await handleResponse(response);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching cabinet categories:', error);
      return [];
    }
  },

  async getModels(params: any = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${API_BASE}/cabinet-catalog/models?${queryString}`, {
        headers: getAuthHeaders(),
      });

      const result = await handleResponse(response);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching cabinet models:', error);
      return [];
    }
  },

  async getModel(id: number) {
    try {
      const response = await fetch(`${API_BASE}/cabinet-catalog/models/${id}`, {
        headers: getAuthHeaders(),
      });

      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching cabinet model:', error);
      return null;
    }
  },

  async getMaterials(type?: string) {
    try {
      const queryParams = type ? `?type=${type}` : '';
      const response = await fetch(`${API_BASE}/cabinet-catalog/materials${queryParams}`, {
        headers: getAuthHeaders(),
      });

      const result = await handleResponse(response);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching cabinet materials:', error);
      return [];
    }
  },

  async getHardware(type?: string) {
    try {
      const queryParams = type ? `?type=${type}` : '';
      const response = await fetch(`${API_BASE}/cabinet-catalog/hardware${queryParams}`, {
        headers: getAuthHeaders(),
      });

      const result = await handleResponse(response);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching cabinet hardware:', error);
      return [];
    }
  },

  async getProjects(params: any = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${API_BASE}/cabinet-catalog/projects?${queryString}`, {
        headers: getAuthHeaders(),
      });

      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching cabinet projects:', error);
      return { projects: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } };
    }
  },

  async getProject(id: number) {
    try {
      const response = await fetch(`${API_BASE}/cabinet-catalog/projects/${id}`, {
        headers: getAuthHeaders(),
      });

      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching cabinet project:', error);
      return { items: [] };
    }
  },

  async createProject(projectData: any) {
    const response = await fetch(`${API_BASE}/cabinet-catalog/projects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(projectData),
    });

    return handleResponse(response);
  },

  async updateProject(id: number, projectData: any) {
    const response = await fetch(`${API_BASE}/cabinet-catalog/projects/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(projectData),
    });

    return handleResponse(response);
  },

  async addCabinetToProject(projectId: number, cabinetData: any) {
    const response = await fetch(`${API_BASE}/cabinet-catalog/projects/${projectId}/items`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(cabinetData),
    });

    return handleResponse(response);
  },

  async calculateCabinet(cabinetData: any) {
    const response = await fetch(`${API_BASE}/cabinet-catalog/calculate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(cabinetData),
    });

    return handleResponse(response);
  },

  async generateCuttingOptimization(projectId: number) {
    const response = await fetch(`${API_BASE}/cabinet-catalog/projects/${projectId}/cutting-optimization`, {
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  }
};