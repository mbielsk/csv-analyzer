import Papa from 'papaparse';
import type { Transaction } from '@/types';
import { CSV_CONFIG } from '@/types';
import { normalizeAmount } from './amountNormalizer';
import { parsePaymentStatus } from './paymentParser';

let idCounter = 0;

function generateId(): string {
  return `txn_${Date.now()}_${++idCounter}`;
}

export function parseCSV(csvContent: string): Transaction[] {
  const lines = csvContent.split('\n');
  
  // Skip first 3 rows (metadata) and get data starting from row 4 (header)
  const dataLines = lines.slice(CSV_CONFIG.skipRows);
  const csvData = dataLines.join('\n');

  const result = Papa.parse<string[]>(csvData, {
    skipEmptyLines: true,
  });

  if (result.data.length < 2) {
    return [];
  }

  const headers = result.data[0];
  const dataRows = result.data.slice(1);

  const colIndex = {
    rodzaj: headers.indexOf(CSV_CONFIG.columns.rodzaj),
    skad: headers.indexOf(CSV_CONFIG.columns.skad),
    co: headers.indexOf(CSV_CONFIG.columns.co),
    zaIle: headers.indexOf(CSV_CONFIG.columns.zaIle),
    oplacone: headers.indexOf(CSV_CONFIG.columns.oplacone),
    bank: headers.indexOf(CSV_CONFIG.columns.bank),
  };

  const transactions: Transaction[] = [];

  for (const row of dataRows) {
    if (!row || row.length === 0 || row.every(cell => !cell?.trim())) {
      continue;
    }

    const zaIleOriginal = row[colIndex.zaIle] || '';
    const zaIle = normalizeAmount(zaIleOriginal);

    if (zaIle === null) {
      continue;
    }

    transactions.push({
      id: generateId(),
      rodzaj: row[colIndex.rodzaj] || '',
      skad: row[colIndex.skad] || '',
      co: row[colIndex.co] || '',
      zaIle,
      zaIleOriginal,
      oplacone: parsePaymentStatus(row[colIndex.oplacone] || ''),
      bank: row[colIndex.bank] || '',
    });
  }

  return transactions;
}

export function parseCSVFile(file: File): Promise<Transaction[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        const transactions = parseCSV(content);
        resolve(transactions);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
