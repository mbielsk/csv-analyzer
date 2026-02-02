import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Transaction, FileData } from '@/types';
import { api, type ApiTransaction, type TransactionFilter } from '@/api/client';
import { calculatePaymentSummary, groupByCategory, getTopCategories, getTopCategory, groupBySource, getTopSources } from '@/utils/aggregations';
import { filterByCategory } from '@/utils/tableUtils';

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
  const [files, setFiles] = useState<FileData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  const [excludedSources, setExcludedSources] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      
      // Select first file by default if none selected
      if (mapped.length > 0 && selectedFileIds.length === 0) {
        setSelectedFileIds([mapped[0].id]);
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
  const filteredTransactions = useMemo(
    () => filterByCategory(transactions, categoryFilter),
    [transactions, categoryFilter]
  );

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
        setSelectedFileIds([newFile.id]);
      }
      
      setCategoryFilter(null);
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
      setSelectedFileIds(prev => {
        const newSelected = prev.filter(id => id !== fileId);
        if (newSelected.length === 0) {
          const remaining = files.filter(f => f.id !== fileId);
          return remaining.length > 0 ? [remaining[0].id] : [];
        }
        return newSelected;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    }
  }, [files]);

  const handleSelectFiles = useCallback((fileIds: string[]) => {
    setSelectedFileIds(fileIds);
    setCategoryFilter(null);
  }, []);

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
    setSelectedFileIds([]);
    setExcludedCategories([]);
    setExcludedSources([]);
    setCategoryFilter(null);
    setError(null);
  }, [files]);

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
