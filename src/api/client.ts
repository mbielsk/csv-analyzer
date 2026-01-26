const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface RequestOptions {
  method?: string;
  body?: FormData | string;
  headers?: Record<string, string>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;
  
  const config: RequestInit = {
    method,
    headers: body instanceof FormData ? headers : { 'Content-Type': 'application/json', ...headers },
  };
  
  if (body) {
    config.body = body;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// Types matching backend
export interface ApiFile {
  id: string;
  name: string;
  uploadedAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface ApiTransaction {
  id: string;
  fileId: string;
  category: string;
  source: string;
  description: string;
  amount: number;
  amountOriginal: string;
  isPaid: boolean;
  isCash: string;
  transactionDate: string | null;
  createdAt: number;
}

export interface Pagination {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface PaymentSummary {
  totalSpent: number;
  paidAmount: number;
  unpaidAmount: number;
  paidCount: number;
  unpaidCount: number;
}

export interface CategoryTotal {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface SourceTotal {
  source: string;
  total: number;
  count: number;
  percentage: number;
}

export interface UploadResponse {
  file: ApiFile;
  transactionCount: number;
}

// Filter params builder
function buildFilterParams(filter: TransactionFilter): URLSearchParams {
  const params = new URLSearchParams();
  
  if (filter.fileIds?.length) params.set('file_ids', filter.fileIds.join(','));
  if (filter.excludeCategories?.length) params.set('exclude_categories', filter.excludeCategories.join(','));
  if (filter.excludeSources?.length) params.set('exclude_sources', filter.excludeSources.join(','));
  if (filter.isPaid !== undefined) params.set('is_paid', String(filter.isPaid));
  if (filter.dateFrom) params.set('date_from', filter.dateFrom);
  if (filter.dateTo) params.set('date_to', filter.dateTo);
  
  return params;
}

export interface TransactionFilter {
  fileIds?: string[];
  excludeCategories?: string[];
  excludeSources?: string[];
  isPaid?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

// API functions
export const api = {
  // Files
  getFiles: () => request<ApiFile[]>('/files'),
  
  getFile: (id: string) => request<ApiFile>(`/files/${id}`),
  
  uploadFile: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    return request<UploadResponse>('/files', { method: 'POST', body: formData });
  },
  
  deleteFile: (id: string) => request<{ message: string }>(`/files/${id}`, { method: 'DELETE' }),
  
  // Transactions - no pagination params = get all
  getTransactions: (filter: TransactionFilter = {}) => {
    const params = buildFilterParams(filter);
    return request<PaginatedResponse<ApiTransaction>>(`/transactions?${params}`);
  },
  
  // Stats
  getSummary: (filter: TransactionFilter = {}) => {
    const params = buildFilterParams(filter);
    return request<PaymentSummary>(`/stats/summary?${params}`);
  },
  
  getCategories: (filter: TransactionFilter = {}) => {
    const params = buildFilterParams(filter);
    return request<CategoryTotal[]>(`/stats/categories?${params}`);
  },
  
  getSources: (filter: TransactionFilter = {}) => {
    const params = buildFilterParams(filter);
    return request<SourceTotal[]>(`/stats/sources?${params}`);
  },
  
  getTopCategory: (filter: TransactionFilter = {}) => {
    const params = buildFilterParams(filter);
    return request<CategoryTotal | null>(`/stats/top-category?${params}`);
  },

  // Recurring
  getRecurring: (minConfidence = 0.5) => {
    const params = new URLSearchParams();
    params.set('min_confidence', String(minConfidence));
    return request<RecurringResponse>(`/recurring?${params}`);
  },

  getRecurringPattern: (id: string) => request<RecurringPatternWithTransactions>(`/recurring/${id}`),

  updateRecurringPattern: (id: string, data: RecurringUpdateRequest) =>
    request<{ message: string }>(`/recurring/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteRecurringPattern: (id: string) =>
    request<{ message: string }>(`/recurring/${id}`, { method: 'DELETE' }),

  recalculateRecurring: () =>
    request<{ message: string }>('/recurring/recalculate', { method: 'POST' }),
};

// Recurring types
export interface RecurringPattern {
  id: string;
  source: string;
  category: string;
  descriptionPattern: string | null;
  avgAmount: number;
  minAmount: number | null;
  maxAmount: number | null;
  amountVariance: number | null;
  frequency: string | null;
  avgIntervalDays: number | null;
  intervalVariance: number | null;
  lastOccurrence: string | null;
  nextExpected: string | null;
  occurrenceCount: number;
  confidence: number;
  detectionMode: string;
  isConfirmed: boolean | null;
  userLabel: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface RecurringPatternWithTransactions extends RecurringPattern {
  transactions: ApiTransaction[];
}

export interface RecurringSummary {
  totalMonthly: number;
  totalYearly: number;
  patternCount: number;
}

export interface RecurringResponse {
  patterns: RecurringPattern[];
  summary: RecurringSummary;
}

export interface RecurringUpdateRequest {
  isConfirmed?: boolean;
  userLabel?: string;
}
