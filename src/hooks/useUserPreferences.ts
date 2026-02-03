import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'csv-analyzer-preferences';
const DEBOUNCE_MS = 500;

export interface UserPreferences {
  // File selection
  selectedFileIds: string[];
  
  // Filters
  excludedCategories: string[];
  excludedSources: string[];
  
  // Table preferences
  tablePageSize: number;
  
  // Chart preferences
  defaultChartType: 'spending' | 'funding';
  defaultDisplayMode: 'value' | 'percent';
  
  // UI state
  fileSelectorExpanded: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  selectedFileIds: [],
  excludedCategories: [],
  excludedSources: [],
  tablePageSize: 50,
  defaultChartType: 'spending',
  defaultDisplayMode: 'value',
  fileSelectorExpanded: true,
};

function loadPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_PREFERENCES };
    
    const parsed = JSON.parse(stored);
    // Merge with defaults to handle new fields
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch (error) {
    console.error('Failed to load preferences:', error);
    return { ...DEFAULT_PREFERENCES };
  }
}

function savePreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error('Failed to save preferences:', error);
  }
}

export function useUserPreferences() {
  const [prefs, setPrefsState] = useState<UserPreferences>(loadPreferences);
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // Debounced save
  useEffect(() => {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    
    const timer = setTimeout(() => {
      savePreferences(prefs);
    }, DEBOUNCE_MS);
    
    setSaveTimer(timer);
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [prefs]);

  const setPrefs = useCallback((updater: UserPreferences | ((prev: UserPreferences) => UserPreferences)) => {
    setPrefsState(updater);
  }, []);

  const resetPrefs = useCallback(() => {
    setPrefsState({ ...DEFAULT_PREFERENCES });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const hasActiveFilters = useCallback(() => {
    return prefs.excludedCategories.length > 0 || prefs.excludedSources.length > 0;
  }, [prefs.excludedCategories, prefs.excludedSources]);

  return {
    prefs,
    setPrefs,
    resetPrefs,
    hasActiveFilters,
    isDefault: JSON.stringify(prefs) === JSON.stringify(DEFAULT_PREFERENCES),
  };
}
