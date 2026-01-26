export interface Transaction {
  id: string;
  rodzaj: string;
  skad: string;
  co: string;
  zaIle: number;
  zaIleOriginal: string;
  oplacone: boolean;
  gotowka: string;
  fileId?: string;
}

export interface FileData {
  id: string;
  name: string;
  transactions: Transaction[];
  uploadedAt: number;
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

export interface PaymentSummary {
  totalSpent: number;
  paidAmount: number;
  unpaidAmount: number;
  paidCount: number;
  unpaidCount: number;
}

export interface AppState {
  transactions: Transaction[];
  categoryFilter: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface CSVParseConfig {
  skipRows: number;
  headerRow: number;
  columns: {
    rodzaj: string;
    skad: string;
    co: string;
    zaIle: string;
    oplacone: string;
    gotowka: string;
  };
}

export const CSV_CONFIG: CSVParseConfig = {
  skipRows: 3,
  headerRow: 4,
  columns: {
    rodzaj: 'Rodzaj',
    skad: 'Skąd',
    co: 'Co',
    zaIle: 'Za ile',
    oplacone: 'Opłacone?',
    gotowka: 'Gotówka',
  },
};
