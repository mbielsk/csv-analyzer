import type { Transaction } from '@/types';

export function filterByCategory(transactions: Transaction[], category: string | null): Transaction[] {
  if (!category) {
    return transactions;
  }
  return transactions.filter(t => t.rodzaj === category);
}

export type SortColumn = keyof Transaction;
export type SortDirection = 'asc' | 'desc';

export function sortTransactions(
  transactions: Transaction[],
  column: SortColumn,
  direction: SortDirection
): Transaction[] {
  return [...transactions].sort((a, b) => {
    const aVal = a[column];
    const bVal = b[column];

    let comparison = 0;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
      comparison = (aVal ? 1 : 0) - (bVal ? 1 : 0);
    } else {
      comparison = String(aVal).localeCompare(String(bVal), 'pl');
    }

    return direction === 'asc' ? comparison : -comparison;
  });
}
