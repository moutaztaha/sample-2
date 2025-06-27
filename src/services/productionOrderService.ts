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

export const productionOrderService = {
  async getProductionOrders(params: any = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${API_BASE}/production-orders?${queryString}`, {
        headers: getAuthHeaders(),
      });

      const result = await handleResponse(response);
      return {
        productionOrders: Array.isArray(result?.productionOrders) ? result.productionOrders : [],
        pagination: result?.pagination || { page: 1, limit: 50, total: 0, pages: 0 }
      };
    } catch (error) {
      console.error('Error fetching production orders:', error);
      return {
        productionOrders: [],
        pagination: { page: 1, limit: 50, total: 0, pages: 0 }
      };
    }
  },

  async getProductionOrder(id: number) {
    try {
      const response = await fetch(`${API_BASE}/production-orders/${id}`, {
        headers: getAuthHeaders(),
      });

      const result = await handleResponse(response);
      if (result) {
        // Ensure arrays are always initialized
        result.items = Array.isArray(result.items) ? result.items : [];
        result.operations = Array.isArray(result.operations) ? result.operations : [];
        result.issues = Array.isArray(result.issues) ? result.issues : [];
        result.completions = Array.isArray(result.completions) ? result.completions : [];
      }
      return result;
    } catch (error) {
      console.error('Error fetching production order:', error);
      return { items: [], operations: [], issues: [], completions: [] };
    }
  },

  async createProductionOrder(productionOrder: any) {
    const response = await fetch(`${API_BASE}/production-orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(productionOrder),
    });

    return handleResponse(response);
  },

  async updateProductionOrder(id: number, productionOrder: any) {
    const response = await fetch(`${API_BASE}/production-orders/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(productionOrder),
    });

    return handleResponse(response);
  },

  async updateStatus(id: number, status: string) {
    const response = await fetch(`${API_BASE}/production-orders/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });

    return handleResponse(response);
  },

  async issueMaterials(id: number, issueData: any) {
    const response = await fetch(`${API_BASE}/production-orders/${id}/issue-materials`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(issueData),
    });

    return handleResponse(response);
  },

  async completeProduction(id: number, completionData: any) {
    const response = await fetch(`${API_BASE}/production-orders/${id}/complete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(completionData),
    });

    return handleResponse(response);
  },

  async updateOperationStatus(operationId: number, status: string) {
    const response = await fetch(`${API_BASE}/production-orders/operations/${operationId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });

    return handleResponse(response);
  },

  async deleteProductionOrder(id: number) {
    const response = await fetch(`${API_BASE}/production-orders/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },

  async getStats() {
    try {
      const response = await fetch(`${API_BASE}/production-orders/stats/overview`, {
        headers: getAuthHeaders(),
      });

      const result = await handleResponse(response);
      return {
        total_orders: result?.total_orders || 0,
        draft_count: result?.draft_count || 0,
        planned_count: result?.planned_count || 0,
        in_progress_count: result?.in_progress_count || 0,
        completed_count: result?.completed_count || 0,
        cancelled_count: result?.cancelled_count || 0,
        total_planned_cost: result?.total_planned_cost || 0,
        total_actual_cost: result?.total_actual_cost || 0,
        avg_completion_time_days: result?.avg_completion_time_days || 0,
        ...result
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return {
        total_orders: 0,
        draft_count: 0,
        planned_count: 0,
        in_progress_count: 0,
        completed_count: 0,
        cancelled_count: 0,
        total_planned_cost: 0,
        total_actual_cost: 0,
        avg_completion_time_days: 0
      };
    }
  },
};