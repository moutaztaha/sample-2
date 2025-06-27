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

export const requisitionService = {
  async getRequisitions(params: any = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${API_BASE}/requisitions?${queryString}`, {
        headers: getAuthHeaders(),
      });

      const result = await handleResponse(response);
      // Ensure we always return the expected structure with safe defaults
      return {
        requisitions: Array.isArray(result?.requisitions) ? result.requisitions : [],
        pagination: result?.pagination || { page: 1, limit: 50, total: 0, pages: 0 }
      };
    } catch (error) {
      console.error('Error fetching requisitions:', error);
      // Return safe defaults on error
      return {
        requisitions: [],
        pagination: { page: 1, limit: 50, total: 0, pages: 0 }
      };
    }
  },

  async getRequisition(id: number) {
    try {
      const response = await fetch(`${API_BASE}/requisitions/${id}`, {
        headers: getAuthHeaders(),
      });

      const result = await handleResponse(response);
      // Ensure items is always an array
      if (result && !Array.isArray(result.items)) {
        result.items = [];
      }
      return result;
    } catch (error) {
      console.error('Error fetching requisition:', error);
      return { items: [] };
    }
  },

  async createRequisition(requisition: any) {
    const response = await fetch(`${API_BASE}/requisitions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(requisition),
    });

    return handleResponse(response);
  },

  async updateRequisition(id: number, requisition: any) {
    const response = await fetch(`${API_BASE}/requisitions/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(requisition),
    });

    return handleResponse(response);
  },

  async updateRequisitionStatus(id: number, statusData: any) {
    const response = await fetch(`${API_BASE}/requisitions/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(statusData),
    });

    return handleResponse(response);
  },

  async approveRequisition(id: number, approvalData: any) {
    const response = await fetch(`${API_BASE}/requisitions/${id}/approve`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(approvalData),
    });

    return handleResponse(response);
  },

  async issueItems(id: number, issueData: any) {
    const response = await fetch(`${API_BASE}/requisitions/${id}/issue`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(issueData),
    });

    return handleResponse(response);
  },

  async deleteRequisition(id: number) {
    const response = await fetch(`${API_BASE}/requisitions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },

  async getStats() {
    try {
      const response = await fetch(`${API_BASE}/requisitions/stats/overview`, {
        headers: getAuthHeaders(),
      });

      const result = await handleResponse(response);
      // Ensure stats have default values
      return {
        total_requisitions: result?.total_requisitions || 0,
        pending_count: result?.pending_count || 0,
        approved_count: result?.approved_count || 0,
        rejected_count: result?.rejected_count || 0,
        partially_approved_count: result?.partially_approved_count || 0,
        ...result
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Return safe defaults on error
      return {
        total_requisitions: 0,
        pending_count: 0,
        approved_count: 0,
        rejected_count: 0,
        partially_approved_count: 0
      };
    }
  },
};