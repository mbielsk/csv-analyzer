import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Transaction, FileData } from '@/types';
import { api, type ApiTransaction, type TransactionFilter } from '@/api/client';
import { calculatePaymentSummary, groupByCategory, getTopCategories, getTopCategory, groupBySource, getTopSources } from '@/utils/aggregations';
import { useUserPreferences } from './useUserPreferences';

export type ChartFilter = { type: 'category' | 'bank'; value: string } | null;

// Map API transaction to frontend Transaction
function mapTransaction(t: ApiTransaction): Transaction {
  return {
    id: t.id,
    fileId: t.fileId,
    rodzaj: t.category,
    skad: t.source,
    co: t.description,
    zaIle: t.amount,
    zaIleOriginal: t.amountOriginal,
    oplacone: t.isPaid,
    bank: t.bank || '',
    transactionDate: t.transactionDate,
  };
}

export function useTransactions() {
  const { prefs, setPrefs, resetPrefs, hasActiveFilters } = useUserPreferences();
  
  const [files, setFiles] = useState<FileData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartFilter, setChartFilter] = useState<ChartFilter>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use preferences for state
  const selectedFileIds = prefs.selectedFileIds;
  const excludedCategories = prefs.excludedCategories;
  const excludedSources = prefs.excludedSources;

  // Load files on mount
  useEffect(() => {
    loadFiles();
  }, []);

  // Load transactions when selection or exclusions change
  useEffect(() => {
    if (files.length > 0) {
      loadTransactions();
    }
  }, [selectedFileIds, excludedCategories, excludedSources, files.length]);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      const apiFiles = await api.getFiles();
      const mapped: FileData[] = apiFiles.map(f => ({
        id: f.id,
        name: f.name,
        uploadedAt: f.uploadedAt,
      }));
      setFiles(mapped);
      
      // Select files from preferences, or first file if none selected
      if (mapped.length > 0 && selectedFileIds.length === 0) {
        setPrefs(p => ({ ...p, selectedFileIds: [mapped[0].id] }));
      }
      // Validate selected files still exist
      else if (selectedFileIds.length > 0) {
        const validIds = selectedFileIds.filter(id => 
          id === 'all' || mapped.some(f => f.id === id)
        );
        if (validIds.length !== selectedFileIds.length) {
          setPrefs(p => ({ ...p, selectedFileIds: validIds.length > 0 ? validIds : [mapped[0]?.id].filter(Boolean) }));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const filter: TransactionFilter = {
        fileIds: selectedFileIds.includes('all') ? undefined : selectedFileIds,
        excludeCategories: excludedCategories.length > 0 ? excludedCategories : undefined,
        excludeSources: excludedSources.length > 0 ? excludedSources : undefined,
      };
      
      const result = await api.getTransactions(filter);
      setTransactions(result.data.map(mapTransaction));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    }
  };

  // Get all unique categories and sources (for filter dropdowns)
  const allCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.rodzaj));
    return Array.from(cats).sort();
  }, [transactions]);

  const allSources = useMemo(() => {
    const srcs = new Set(transactions.map(t => t.skad));
    return Array.from(srcs).sort();
  }, [transactions]);

  const paymentSummary = useMemo(() => calculatePaymentSummary(transactions), [transactions]);
  const categoryTotals = useMemo(() => groupByCategory(transactions), [transactions]);
  const topCategories = useMemo(() => getTopCategories(transactions, 5), [transactions]);
  const topCategory = useMemo(() => getTopCategory(transactions), [transactions]);
  const sourceTotals = useMemo(() => groupBySource(transactions), [transactions]);
  const topSources = useMemo(() => getTopSources(transactions, 5), [transactions]);
  
  const filteredTransactions = useMemo(() => {
    if (!chartFilter) return transactions;
    if (chartFilter.type === 'category') {
      return transactions.filter(t => t.rodzaj === chartFilter.value);
    }
    if (chartFilter.type === 'bank') {
      return transactions.filter(t => (t.bank || 'Unknown') === chartFilter.value);
    }
    return transactions;
  }, [transactions, chartFilter]);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.uploadFile(file);
      
      const newFile: FileData = {
        id: result.file.id,
        name: result.file.name,
        uploadedAt: result.file.uploadedAt,
        transactionCount: result.transactionCount,
      };
      
      setFiles(prev => [...prev, newFile]);
      
      // If this is the first file, select it
      if (files.length === 0) {
        setPrefs(p => ({ ...p, selectedFileIds: [newFile.id] }));
      }
      
      setChartFilter(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setIsLoading(false);
    }
  }, [files.length]);

  const handleRemoveFile = useCallback(async (fileId: string) => {
    try {
      await api.deleteFile(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      setPrefs(p => {
        const newSelected = p.selectedFileIds.filter(id => id !== fileId);
        if (newSelected.length === 0) {
          const remaining = files.filter(f => f.id !== fileId);
          return { ...p, selectedFileIds: remaining.length > 0 ? [remaining[0].id] : [] };
        }
        return { ...p, selectedFileIds: newSelected };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    }
  }, [files, setPrefs]);

  const handleSelectFiles = useCallback((fileIds: string[]) => {
    setPrefs(p => ({ ...p, selectedFileIds: fileIds }));
    setChartFilter(null);
  }, [setPrefs]);

  const handleReset = useCallback(async () => {
    // Delete all files from backend
    try {
      for (const file of files) {
        await api.deleteFile(file.id);
      }
    } catch {
      // ignore errors during reset
    }
    
    setFiles([]);
    setTransactions([]);
    resetPrefs();
    setChartFilter(null);
    setError(null);
  }, [files, resetPrefs]);

  const handleChartFilter = useCallback((filter: ChartFilter) => {
    setChartFilter(filter);
  }, []);

  const handleExcludeCategoriesChange = useCallback((categories: string[]) => {
    setPrefs(p => ({ ...p, excludedCategories: categories }));
  }, [setPrefs]);

  const handleExcludeSourcesChange = useCallback((sources: string[]) => {
    setPrefs(p => ({ ...p, excludedSources: sources }));
  }, [setPrefs]);

  return {
    files,
    selectedFileIds,
    transactions,
    filteredTransactions,
    chartFilter,
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
    handleChartFilter,
    handleExcludeCategoriesChange,
    handleExcludeSourcesChange,
    hasActiveFilters: hasActiveFilters(),
    prefs,
    setPrefs,
    resetPrefs,
  };
}
