export interface Transaction {
  id: string;
  fileId?: string;
  rodzaj: string;      // category
  skad: string;        // source
  co: string;          // description
  zaIle: number;       // amount
  zaIleOriginal: string; // amountOriginal
  oplacone: boolean;   // isPaid
  gotowka: string;     // isCash
  transactionDate?: string | null;
}

export interface FileData {
  id: string;
  name: string;
  uploadedAt: number;
  transactionCount?: number;
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
  cashAmount: number;
  cashCount: number;
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
