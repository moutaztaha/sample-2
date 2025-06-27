import { useState, useEffect } from 'react';
import { Column } from '../components/Common/ColumnCustomizer';
import { columnPreferenceService } from '../services/columnPreferenceService';

export const useColumnPreferences = (
  pageId: string,
  defaultColumns: Column[]
) => {
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load saved preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        console.log('Loading preferences for', pageId);
        setLoading(true);
        const savedPreferences = await columnPreferenceService.getColumnPreferences(pageId);
        console.log('Loaded preferences:', savedPreferences);
        
        if (savedPreferences && Array.isArray(savedPreferences)) {
          // Merge saved preferences with default columns to handle any new columns added
          const mergedColumns = defaultColumns.map(defaultCol => {
            const savedCol = savedPreferences.find(col => col.id === defaultCol.id);
            return savedCol ? { ...defaultCol, ...savedCol } : defaultCol;
          });
          
          console.log('Merged columns:', mergedColumns);
          setColumns(mergedColumns);
          
          // Also save to localStorage as a backup
          localStorage.setItem(`column_prefs_${pageId}`, JSON.stringify(mergedColumns));
        } else {
          // Check if we have preferences in localStorage
          const localPrefs = localStorage.getItem(`column_prefs_${pageId}`);
          if (localPrefs) {
            try {
              const parsedLocalPrefs = JSON.parse(localPrefs);
              if (Array.isArray(parsedLocalPrefs) && parsedLocalPrefs.length > 0) {
                console.log('Using localStorage preferences:', parsedLocalPrefs);
                
                // Merge local preferences with default columns
                const mergedColumns = defaultColumns.map(defaultCol => {
                  const savedCol = parsedLocalPrefs.find(col => col.id === defaultCol.id);
                  return savedCol ? { ...defaultCol, ...savedCol } : defaultCol;
                });
                
                setColumns(mergedColumns);
                return;
              }
            } catch (e) {
              console.error('Error parsing localStorage preferences:', e);
            }
          }
          
          console.log('No saved preferences found, using defaults');
          setColumns(defaultColumns);
        }
      } catch (error) {
        console.error('Error loading column preferences:', error);
        
        // Try to load from localStorage as fallback
        const localPrefs = localStorage.getItem(`column_prefs_${pageId}`);
        if (localPrefs) {
          try {
            const parsedLocalPrefs = JSON.parse(localPrefs);
            if (Array.isArray(parsedLocalPrefs) && parsedLocalPrefs.length > 0) {
              console.log('Using localStorage preferences after error:', parsedLocalPrefs);
              
              // Merge local preferences with default columns
              const mergedColumns = defaultColumns.map(defaultCol => {
                const savedCol = parsedLocalPrefs.find(col => col.id === defaultCol.id);
                return savedCol ? { ...defaultCol, ...savedCol } : defaultCol;
              });
              
              setColumns(mergedColumns);
            } else {
              setColumns(defaultColumns);
            }
          } catch (e) {
            console.error('Error parsing localStorage preferences:', e);
            setColumns(defaultColumns);
          }
        } else {
          setColumns(defaultColumns);
        }
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [pageId, defaultColumns]);

  const handleSaveColumnPreferences = async (updatedColumns: Column[]) => {
    try {
      console.log('Saving column preferences:', updatedColumns);
      
      // Save to localStorage immediately as a backup
      localStorage.setItem(`column_prefs_${pageId}`, JSON.stringify(updatedColumns));
      
      // Then save to server
      await columnPreferenceService.saveColumnPreferences(pageId, updatedColumns);
      setColumns(updatedColumns);
    } catch (error) {
      console.error('Error saving column preferences:', error);
      // Even if server save fails, we still have localStorage backup
    }
  };

  // Get visible columns sorted by order
  const visibleColumns = columns
    .filter(col => col.visible)
    .sort((a, b) => a.order - b.order);

  return {
    columns,
    visibleColumns,
    showColumnCustomizer,
    setShowColumnCustomizer,
    handleSaveColumnPreferences,
    loading
  };
};