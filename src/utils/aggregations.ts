import type { Transaction, CategoryTotal, PaymentSummary, SourceTotal } from '@/types';

export function calculatePaymentSummary(transactions: Transaction[]): PaymentSummary {
  let totalSpent = 0;
  let paidAmount = 0;
  let unpaidAmount = 0;
  let paidCount = 0;
  let unpaidCount = 0;
  let cashAmount = 0;
  let cashCount = 0;

  for (const t of transactions) {
    totalSpent += t.zaIle;
    if (t.oplacone) {
      paidAmount += t.zaIle;
      paidCount++;
    } else {
      unpaidAmount += t.zaIle;
      unpaidCount++;
    }
    
    const isCash = t.gotowka?.toLowerCase();
    if (isCash === '✅' || isCash === 'tak' || isCash === 'yes' || isCash === 'true') {
      cashAmount += t.zaIle;
      cashCount++;
    }
  }

  return { totalSpent, paidAmount, unpaidAmount, paidCount, unpaidCount, cashAmount, cashCount };
}

export function groupByCategory(transactions: Transaction[]): CategoryTotal[] {
  const categoryMap = new Map<string, { total: number; count: number }>();

  for (const t of transactions) {
    const existing = categoryMap.get(t.rodzaj);
    if (existing) {
      existing.total += t.zaIle;
      existing.count++;
    } else {
      categoryMap.set(t.rodzaj, { total: t.zaIle, count: 1 });
    }
  }

  const totalSum = transactions.reduce((sum, t) => sum + t.zaIle, 0);

  const result: CategoryTotal[] = [];
  for (const [category, data] of categoryMap) {
    result.push({
      category,
      total: data.total,
      count: data.count,
      percentage: totalSum > 0 ? (data.total / totalSum) * 100 : 0,
    });
  }

  return result.sort((a, b) => b.total - a.total);
}

export function groupBySource(transactions: Transaction[]): SourceTotal[] {
  const sourceMap = new Map<string, { total: number; count: number }>();

  for (const t of transactions) {
    const source = t.skad || 'Nieznane';
    const existing = sourceMap.get(source);
    if (existing) {
      existing.total += t.zaIle;
      existing.count++;
    } else {
      sourceMap.set(source, { total: t.zaIle, count: 1 });
    }
  }

  const totalSum = transactions.reduce((sum, t) => sum + t.zaIle, 0);

  const result: SourceTotal[] = [];
  for (const [source, data] of sourceMap) {
    result.push({
      source,
      total: data.total,
      count: data.count,
      percentage: totalSum > 0 ? (data.total / totalSum) * 100 : 0,
    });
  }

  return result.sort((a, b) => b.total - a.total);
}

export function getTopSources(transactions: Transaction[], limit: number = 5): SourceTotal[] {
  const grouped = groupBySource(transactions);
  return grouped.slice(0, limit);
}

export function getTopCategories(transactions: Transaction[], limit: number = 5): CategoryTotal[] {
  const grouped = groupByCategory(transactions);
  return grouped.slice(0, limit);
}

export function getTopCategory(transactions: Transaction[]): CategoryTotal | null {
  const grouped = groupByCategory(transactions);
  return grouped.length > 0 ? grouped[0] : null;
}
