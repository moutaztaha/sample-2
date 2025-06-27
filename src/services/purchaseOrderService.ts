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

export const purchaseOrderService = {
  async getPurchaseOrders(params: any = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${API_BASE}/purchase-orders?${queryString}`, {
        headers: getAuthHeaders(),
      });

      const result = await handleResponse(response);
      return {
        purchaseOrders: Array.isArray(result?.purchaseOrders) ? result.purchaseOrders : [],
        pagination: result?.pagination || { page: 1, limit: 50, total: 0, pages: 0 }
      };
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      return {
        purchaseOrders: [],
        pagination: { page: 1, limit: 50, total: 0, pages: 0 }
      };
    }
  },

  async getPurchaseOrder(id: number) {
    try {
      const response = await fetch(`${API_BASE}/purchase-orders/${id}`, {
        headers: getAuthHeaders(),
      });

      const result = await handleResponse(response);
      if (result && !Array.isArray(result.items)) {
        result.items = [];
      }
      return result;
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      return { items: [] };
    }
  },

  async createPurchaseOrder(purchaseOrder: any) {
    const response = await fetch(`${API_BASE}/purchase-orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(purchaseOrder),
    });

    return handleResponse(response);
  },

  async updatePurchaseOrder(id: number, purchaseOrder: any) {
    const response = await fetch(`${API_BASE}/purchase-orders/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(purchaseOrder),
    });

    return handleResponse(response);
  },

  async createFromRequisition(requisitionId: number, data: any) {
    const response = await fetch(`${API_BASE}/purchase-orders/from-requisition/${requisitionId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    return handleResponse(response);
  },

  async updateStatus(id: number, statusData: any) {
    const response = await fetch(`${API_BASE}/purchase-orders/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(statusData),
    });

    return handleResponse(response);
  },

  async receiveItems(id: number, receivingData: any) {
    const response = await fetch(`${API_BASE}/purchase-orders/${id}/receive`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(receivingData),
    });

    return handleResponse(response);
  },

  async deletePurchaseOrder(id: number) {
    const response = await fetch(`${API_BASE}/purchase-orders/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },

  async getStats() {
    try {
      const response = await fetch(`${API_BASE}/purchase-orders/stats/overview`, {
        headers: getAuthHeaders(),
      });

      const result = await handleResponse(response);
      return {
        total_pos: result?.total_pos || 0,
        draft_count: result?.draft_count || 0,
        pending_approval_count: result?.pending_approval_count || 0,
        approved_count: result?.approved_count || 0,
        sent_count: result?.sent_count || 0,
        partially_received_count: result?.partially_received_count || 0,
        received_count: result?.received_count || 0,
        cancelled_count: result?.cancelled_count || 0,
        total_value: result?.total_value || 0,
        avg_order_value: result?.avg_order_value || 0,
        ...result
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return {
        total_pos: 0,
        draft_count: 0,
        pending_approval_count: 0,
        approved_count: 0,
        sent_count: 0,
        partially_received_count: 0,
        received_count: 0,
        cancelled_count: 0,
        total_value: 0,
        avg_order_value: 0
      };
    }
  },
};