import { useState, useMemo, useCallback, useEffect } from 'react';
import type { FileData } from '@/types';
import { parseCSVFile } from '@/utils/csvParser';
import { calculatePaymentSummary, groupByCategory, getTopCategories, getTopCategory, groupBySource, getTopSources } from '@/utils/aggregations';
import { filterByCategory } from '@/utils/tableUtils';

const STORAGE_KEY = 'kiro-finance-files';

function loadFromStorage(): FileData[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore parse errors
  }
  return [];
}

function saveToStorage(files: FileData[]) {
  try {
    if (files.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function useTransactions() {
  const [files, setFiles] = useState<FileData[]>(() => loadFromStorage());
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>(() => {
    const loaded = loadFromStorage();
    return loaded.length > 0 ? [loaded[0].id] : [];
  });
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  const [excludedSources, setExcludedSources] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save to localStorage when files change
  useEffect(() => {
    saveToStorage(files);
  }, [files]);

  // Get transactions from selected files (before exclusions)
  const rawTransactions = useMemo(() => {
    if (selectedFileIds.length === 0 || selectedFileIds.includes('all')) {
      return files.flatMap(f => f.transactions);
    }
    return files
      .filter(f => selectedFileIds.includes(f.id))
      .flatMap(f => f.transactions);
  }, [files, selectedFileIds]);

  // Get all unique categories and sources (for filter dropdowns)
  const allCategories = useMemo(() => {
    const cats = new Set(rawTransactions.map(t => t.rodzaj));
    return Array.from(cats).sort();
  }, [rawTransactions]);

  const allSources = useMemo(() => {
    const srcs = new Set(rawTransactions.map(t => t.skad));
    return Array.from(srcs).sort();
  }, [rawTransactions]);

  // Apply exclusions
  const transactions = useMemo(() => {
    return rawTransactions.filter(t => {
      if (excludedCategories.includes(t.rodzaj)) return false;
      if (excludedSources.includes(t.skad)) return false;
      return true;
    });
  }, [rawTransactions, excludedCategories, excludedSources]);

  const paymentSummary = useMemo(() => calculatePaymentSummary(transactions), [transactions]);
  const categoryTotals = useMemo(() => groupByCategory(transactions), [transactions]);
  const topCategories = useMemo(() => getTopCategories(transactions, 5), [transactions]);
  const topCategory = useMemo(() => getTopCategory(transactions), [transactions]);
  const sourceTotals = useMemo(() => groupBySource(transactions), [transactions]);
  const topSources = useMemo(() => getTopSources(transactions, 5), [transactions]);
  const filteredTransactions = useMemo(
    () => filterByCategory(transactions, categoryFilter),
    [transactions, categoryFilter]
  );

  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const parsed = await parseCSVFile(file);
      const fileId = generateFileId();
      const transactionsWithFileId = parsed.map(t => ({ ...t, fileId }));
      
      const newFile: FileData = {
        id: fileId,
        name: file.name,
        transactions: transactionsWithFileId,
        uploadedAt: Date.now(),
      };
      
      setFiles(prev => [...prev, newFile]);
      
      // If this is the first file, select it
      setSelectedFileIds(prev => prev.length === 0 ? [fileId] : prev);
      setCategoryFilter(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRemoveFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setSelectedFileIds(prev => {
      const newSelected = prev.filter(id => id !== fileId);
      // If we removed the only selected file, select the first remaining
      if (newSelected.length === 0) {
        const remaining = files.filter(f => f.id !== fileId);
        return remaining.length > 0 ? [remaining[0].id] : [];
      }
      return newSelected;
    });
  }, [files]);

  const handleSelectFiles = useCallback((fileIds: string[]) => {
    setSelectedFileIds(fileIds);
    setCategoryFilter(null);
  }, []);

  const handleReset = useCallback(() => {
    setFiles([]);
    setSelectedFileIds([]);
    setExcludedCategories([]);
    setExcludedSources([]);
    setCategoryFilter(null);
    setError(null);
  }, []);

  const handleCategoryFilter = useCallback((category: string | null) => {
    setCategoryFilter(prev => prev === category ? null : category);
  }, []);

  const handleExcludeCategoriesChange = useCallback((categories: string[]) => {
    setExcludedCategories(categories);
  }, []);

  const handleExcludeSourcesChange = useCallback((sources: string[]) => {
    setExcludedSources(sources);
  }, []);

  return {
    files,
    selectedFileIds,
    transactions,
    filteredTransactions,
    categoryFilter,
    isLoading,
    error,
    paymentSummary,
    categoryTotals,
    topCategories,
    topCategory,
    sourceTotals,
    topSources,
    allCategories,
    allSources,
    excludedCategories,
    excludedSources,
    handleFileUpload,
    handleRemoveFile,
    handleSelectFiles,
    handleReset,
    handleCategoryFilter,
    handleExcludeCategoriesChange,
    handleExcludeSourcesChange,
  };
}
