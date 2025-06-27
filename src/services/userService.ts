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
    // Capture the raw response text for better debugging
    const text = await response.text();
    console.error('Backend error response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      body: text
    });
    
    let errorMessage = 'Request failed';
    try {
      const errorData = JSON.parse(text);
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch (e) {
      // If JSON parsing fails, use the raw text as the error message
      errorMessage = text || response.statusText || errorMessage;
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

export const userService = {
  async getUsers() {
    const response = await fetch(`${API_BASE}/users`, {
      headers: getAuthHeaders(),
    });

    const result = await handleResponse(response);
    // Ensure we always return an array
    return Array.isArray(result) ? result : [];
  },

  async createUser(userData: any) {
    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });

    return handleResponse(response);
  },

  async updateUser(id: number, userData: any) {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });

    return handleResponse(response);
  },

  async deleteUser(id: number) {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },

  // Permission management methods
  async getPermissions() {
    const response = await fetch(`${API_BASE}/users/permissions`, {
      headers: getAuthHeaders(),
    });

    const result = await handleResponse(response);
    return Array.isArray(result) ? result : [];
  },

  async getRolePermissions() {
    try {
      const response = await fetch(`${API_BASE}/users/role-permissions`, {
        headers: getAuthHeaders(),
      });

      const result = await handleResponse(response);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      // Return default roles with empty permissions as fallback
      return [
        { role: 'admin', permissions: [] },
        { role: 'manager', permissions: [] },
        { role: 'user', permissions: [] }
      ];
    }
  },

  async updateRolePermissions(rolePermissions: any[]) {
    const response = await fetch(`${API_BASE}/users/role-permissions`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rolePermissions }),
    });

    return handleResponse(response);
  },

  async getUserPermissions(userId: number) {
    const response = await fetch(`${API_BASE}/users/${userId}/permissions`, {
      headers: getAuthHeaders(),
    });

    const result = await handleResponse(response);
    return Array.isArray(result) ? result : [];
  },

  async updateUserPermissions(userId: number, permissions: string[]) {
    const response = await fetch(`${API_BASE}/users/${userId}/permissions`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ permissions }),
    });

    return handleResponse(response);
  },

  // New methods for dynamic roles
  async getRoles() {
    try {
      const response = await fetch(`${API_BASE}/users/roles`, {
        headers: getAuthHeaders(),
      });

      const result = await handleResponse(response);
      return Array.isArray(result) ? result : ['admin', 'manager', 'user'];
    } catch (error) {
      console.error('Error fetching roles:', error);
      // Return default roles as fallback
      return ['admin', 'manager', 'user'];
    }
  },

  async createRole(role: string, permissions: string[] = []) {
    const response = await fetch(`${API_BASE}/users/roles`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role, permissions }),
    });

    return handleResponse(response);
  },

  async deleteRole(role: string) {
    const response = await fetch(`${API_BASE}/users/roles/${role}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },

  // User-specific permissions
  async getUserSpecificPermissions(userId: number) {
    const response = await fetch(`${API_BASE}/users/${userId}/specific-permissions`, {
      headers: getAuthHeaders(),
    });

    const result = await handleResponse(response);
    return Array.isArray(result) ? result : [];
  },

  async updateUserSpecificPermissions(userId: number, permissions: any[]) {
    // Enhanced validation and logging for better debugging
    console.log('updateUserSpecificPermissions called with:', { userId, permissions });
    
    // Validate and convert userId to ensure it's a valid number
    const validUserId = parseInt(userId.toString(), 10);
    if (!Number.isInteger(validUserId) || validUserId <= 0) {
      console.error('Invalid userId provided:', { original: userId, parsed: validUserId });
      throw new Error('Invalid user ID: must be a positive integer');
    }

    // Validate permissions array
    if (!Array.isArray(permissions)) {
      console.error('Invalid permissions provided - not an array:', permissions);
      throw new Error('Permissions must be an array');
    }

    // Log the request details for debugging
    const requestUrl = `${API_BASE}/users/${validUserId}/specific-permissions`;
    const requestBody = { permissions };
    
    console.log('Making request to:', requestUrl);
    console.log('Request body:', requestBody);

    try {
      const response = await fetch(requestUrl, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody),
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error in updateUserSpecificPermissions:', {
        userId: validUserId,
        permissions,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
};