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

export const backupService = {
  async createBackup() {
    const response = await fetch(`${API_BASE}/backup/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },

  async listBackups() {
    const response = await fetch(`${API_BASE}/backup/list`, {
      headers: getAuthHeaders(),
    });

    const result = await handleResponse(response);
    return result.backups || [];
  },

  async restoreBackup(backupName: string) {
    const response = await fetch(`${API_BASE}/backup/restore`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ backupName }),
    });

    return handleResponse(response);
  },

  async deleteBackup(backupName: string) {
    const response = await fetch(`${API_BASE}/backup/${backupName}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },

  async downloadBackup(backupName: string) {
    const token = localStorage.getItem('token');
    const url = `${API_BASE}/backup/download/${backupName}`;
    
    // Create a hidden anchor element to trigger download
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = backupName;
    
    // Add authorization header via fetch and convert to blob
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to download backup');
    }
    
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    
    a.href = objectUrl;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    URL.revokeObjectURL(objectUrl);
    document.body.removeChild(a);
  }
};