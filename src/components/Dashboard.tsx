import { DollarSign, CheckCircle, XCircle, TrendingUp, Banknote } from 'lucide-react';
import type { Transaction, CategoryTotal, PaymentSummary, SourceTotal } from '@/types';
import type { ChartFilter } from '@/hooks/useTransactions';
import { KPICard } from './KPICard';
import { TransactionTable } from './TransactionTable';
import { BreakdownChart } from './BreakdownChart';
import { CategoryBarChart } from './CategoryBarChart';
import { SourceBarChart } from './SourceBarChart';
import { RecurringPanel } from './RecurringPanel';

interface DashboardProps {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  chartFilter: ChartFilter;
  paymentSummary: PaymentSummary;
  categoryTotals: CategoryTotal[];
  topCategories: CategoryTotal[];
  topCategory: CategoryTotal | null;
  topSources: SourceTotal[];
  onChartFilter: (filter: ChartFilter) => void;
}

export function Dashboard({
  transactions,
  filteredTransactions,
  chartFilter,
  paymentSummary,
  categoryTotals,
  topCategories,
  topCategory,
  topSources,
  onChartFilter,
}: DashboardProps) {
  const cashPercentage = paymentSummary.totalSpent > 0 
    ? (paymentSummary.cashAmount / paymentSummary.totalSpent * 100).toFixed(1)
    : '0';

  return (
    <div className="p-6 space-y-6 bg-gray-100 min-h-screen">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Spent"
          value={`${(Math.round(paymentSummary.totalSpent * 100) / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <KPICard
          title="Paid"
          value={`${(Math.round(paymentSummary.paidAmount * 100) / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`}
          icon={<CheckCircle className="w-5 h-5 text-green-500" />}
        />
        <KPICard
          title="Unpaid"
          value={`${(Math.round(paymentSummary.unpaidAmount * 100) / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`}
          icon={<XCircle className="w-5 h-5 text-red-500" />}
        />
        <KPICard
          title="Cash"
          value={`${(Math.round(paymentSummary.cashAmount * 100) / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł (${cashPercentage}%)`}
          icon={<Banknote className="w-5 h-5 text-emerald-600" />}
        />
        <KPICard
          title="Top Category"
          value={topCategory?.category || '-'}
          icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
        />
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3" style={{ height: '500px' }}>
          <TransactionTable transactions={filteredTransactions} chartFilter={chartFilter} />
        </div>
        <div className="lg:col-span-2" style={{ height: '500px' }}>
          <BreakdownChart 
            categoryTotals={categoryTotals} 
            transactions={transactions} 
            onFilterChange={onChartFilter}
          />
        </div>
      </div>

      {/* Bottom Row - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryBarChart data={topCategories} limit={5} />
        <SourceBarChart data={topSources} limit={5} />
      </div>

      {/* Recurring Panel */}
      <RecurringPanel />

      {/* Filter indicator */}
      {chartFilter && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Filtering by {chartFilter.type}: {chartFilter.value}
          <button
            onClick={() => onChartFilter(null)}
            className="ml-2 underline hover:no-underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
