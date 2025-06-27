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
  },

  // New methods for part types and model parts
  async getPartTypes() {
    try {
      const response = await fetch(`${API_BASE}/cabinet-catalog/part-types`, {
        headers: getAuthHeaders(),
      });

      const result = await handleResponse(response);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching part types:', error);
      return [];
    }
  },

  async getPartType(id: number) {
    try {
      const response = await fetch(`${API_BASE}/cabinet-catalog/part-types/${id}`, {
        headers: getAuthHeaders(),
      });

      return handleResponse(response);
    } catch (error) {
      console.error('Error fetching part type:', error);
      return null;
    }
  },

  async createPartType(partTypeData: any) {
    const response = await fetch(`${API_BASE}/cabinet-catalog/part-types`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(partTypeData),
    });

    return handleResponse(response);
  },

  async updatePartType(id: number, partTypeData: any) {
    const response = await fetch(`${API_BASE}/cabinet-catalog/part-types/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(partTypeData),
    });

    return handleResponse(response);
  },

  async deletePartType(id: number) {
    const response = await fetch(`${API_BASE}/cabinet-catalog/part-types/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },

  async getModelParts(modelId: number) {
    try {
      const response = await fetch(`${API_BASE}/cabinet-catalog/models/${modelId}/parts`, {
        headers: getAuthHeaders(),
      });

      const result = await handleResponse(response);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching model parts:', error);
      return [];
    }
  },

  async addPartToModel(modelId: number, partData: any) {
    const response = await fetch(`${API_BASE}/cabinet-catalog/models/${modelId}/parts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(partData),
    });

    return handleResponse(response);
  },

  async updateModelPart(modelId: number, partId: number, partData: any) {
    const response = await fetch(`${API_BASE}/cabinet-catalog/models/${modelId}/parts/${partId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(partData),
    });

    return handleResponse(response);
  },

  async deleteModelPart(modelId: number, partId: number) {
    const response = await fetch(`${API_BASE}/cabinet-catalog/models/${modelId}/parts/${partId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },

  // Accessories methods
  async getAccessories(type?: string) {
    try {
      const queryParams = type ? `?type=${type}` : '';
      const response = await fetch(`${API_BASE}/cabinet-catalog/accessories${queryParams}`, {
        headers: getAuthHeaders(),
      });

      const result = await handleResponse(response);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching accessories:', error);
      return [];
    }
  },

  async createAccessory(accessoryData: any) {
    const response = await fetch(`${API_BASE}/cabinet-catalog/accessories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(accessoryData),
    });

    return handleResponse(response);
  },

  async getModelAccessories(modelId: number) {
    try {
      const response = await fetch(`${API_BASE}/cabinet-catalog/models/${modelId}/accessories`, {
        headers: getAuthHeaders(),
      });

      const result = await handleResponse(response);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching model accessories:', error);
      return [];
    }
  },

  async addAccessoryToModel(modelId: number, accessoryData: any) {
    const response = await fetch(`${API_BASE}/cabinet-catalog/models/${modelId}/accessories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(accessoryData),
    });

    return handleResponse(response);
  }
};