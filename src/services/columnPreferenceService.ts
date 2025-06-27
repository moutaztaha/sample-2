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

export const columnPreferenceService = {
  async saveColumnPreferences(pageId: string, columns: any[]) {
    console.log('Saving column preferences for', pageId, columns);
    
    // Store in localStorage as a backup
    localStorage.setItem(`column_prefs_${pageId}`, JSON.stringify(columns));
    
    const response = await fetch(`${API_BASE}/inventory/column-preferences`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ 
        preference_type: pageId,
        preference_data: JSON.stringify(columns) 
      }),
    });

    return handleResponse(response);
  },

  async getColumnPreferences(pageId: string) {
    try {
      console.log('Fetching column preferences for', pageId);
      const response = await fetch(`${API_BASE}/inventory/column-preferences?preference_type=${pageId}`, {
        headers: getAuthHeaders(),
      });

      const result = await handleResponse(response);
      console.log('Received preferences from server:', result);
      
      if (result && result.columns) {
        try {
          // Try to parse the columns field
          const parsedColumns = JSON.parse(result.columns);
          console.log('Successfully parsed column preferences:', parsedColumns);
          return parsedColumns;
        } catch (e) {
          console.error('Failed to parse column preferences from server:', e);
          // Fall back to localStorage if server parsing fails
          const localPrefs = localStorage.getItem(`column_prefs_${pageId}`);
          if (localPrefs) {
            try {
              const parsedLocalPrefs = JSON.parse(localPrefs);
              console.log('Using localStorage fallback for preferences:', parsedLocalPrefs);
              return parsedLocalPrefs;
            } catch (e) {
              console.error('Failed to parse localStorage preferences:', e);
            }
          }
          return null;
        }
      } else {
        // Check localStorage as fallback
        const localPrefs = localStorage.getItem(`column_prefs_${pageId}`);
        if (localPrefs) {
          try {
            const parsedLocalPrefs = JSON.parse(localPrefs);
            console.log('Using localStorage fallback for preferences:', parsedLocalPrefs);
            return parsedLocalPrefs;
          } catch (e) {
            console.error('Failed to parse localStorage preferences:', e);
          }
        }
        return null;
      }
    } catch (error) {
      console.error(`Error fetching column preferences for ${pageId}:`, error);
      
      // Fall back to localStorage if server request fails
      const localPrefs = localStorage.getItem(`column_prefs_${pageId}`);
      if (localPrefs) {
        try {
          const parsedLocalPrefs = JSON.parse(localPrefs);
          console.log('Using localStorage fallback for preferences after server error:', parsedLocalPrefs);
          return parsedLocalPrefs;
        } catch (e) {
          console.error('Failed to parse localStorage preferences:', e);
        }
      }
      return null;
    }
  }
};