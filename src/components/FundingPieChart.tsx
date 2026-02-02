import { useState, useMemo } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { ArrowLeft } from 'lucide-react';
import type { Transaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FundingPieChartProps {
  transactions: Transaction[];
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#eab308', '#22c55e', '#0ea5e9',
  '#d946ef', '#64748b', '#fb7185', '#4ade80', '#38bdf8'
];

type DisplayMode = 'percent' | 'value';

export function FundingPieChart({ transactions }: FundingPieChartProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('percent');
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  
  // Calculate bank totals
  const bankTotals = useMemo(() => {
    const bankMap = new Map<string, number>();
    
    for (const t of transactions) {
      const bank = t.bank || 'Unknown';
      bankMap.set(bank, (bankMap.get(bank) || 0) + t.zaIle);
    }
    
    const total = transactions.reduce((s, t) => s + t.zaIle, 0);
    
    return Array.from(bankMap.entries())
      .map(([bank, amount]) => ({
        bank,
        total: amount,
        count: transactions.filter(t => (t.bank || 'Unknown') === bank).length,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);
  
  const total = bankTotals.reduce((s, d) => s + d.total, 0);
  
  // Calculate category breakdown for selected bank
  const categoryBreakdown = useMemo(() => {
    if (!selectedBank) return [];
    
    const bankTransactions = transactions.filter(t => (t.bank || 'Unknown') === selectedBank);
    const categoryMap = new Map<string, number>();
    
    for (const t of bankTransactions) {
      const category = t.rodzaj || 'Nieznane';
      categoryMap.set(category, (categoryMap.get(category) || 0) + t.zaIle);
    }
    
    const bankTotal = bankTransactions.reduce((s, t) => s + t.zaIle, 0);
    
    return Array.from(categoryMap.entries())
      .map(([category, amount], index) => ({
        id: category,
        label: category,
        value: Math.round(amount * 100) / 100,
        percentage: bankTotal > 0 ? (amount / bankTotal) * 100 : 0,
        color: COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [selectedBank, transactions]);
  
  const chartData = bankTotals.map((d, index) => ({
    id: d.bank,
    label: d.bank,
    value: Math.round(d.total * 100) / 100,
    percentage: total > 0 ? (d.total / total) * 100 : 0,
    color: COLORS[index % COLORS.length],
  }));

  const handleBankClick = (bank: string) => {
    setSelectedBank(bank);
  };

  const handleBack = () => {
    setSelectedBank(null);
  };

  if (transactions.length === 0) {
    return (
      <Card className="bg-white h-full">
        <CardHeader>
          <CardTitle className="text-lg">Funding Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-500">No data to display</p>
        </CardContent>
      </Card>
    );
  }

  const currentData = selectedBank ? categoryBreakdown : chartData;
  const currentTotal = selectedBank 
    ? categoryBreakdown.reduce((s, d) => s + d.value, 0)
    : total;

  return (
    <Card className="bg-white h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedBank && (
            <button
              onClick={handleBack}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <CardTitle className="text-lg">
            {selectedBank ? `${selectedBank} by Category` : 'Funding Breakdown'}
          </CardTitle>
        </div>
        <div className="flex bg-gray-100 rounded-md p-0.5">
          <button
            onClick={() => setDisplayMode('percent')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              displayMode === 'percent' 
                ? 'bg-white shadow text-gray-900' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            %
          </button>
          <button
            onClick={() => setDisplayMode('value')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              displayMode === 'value' 
                ? 'bg-white shadow text-gray-900' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            zł
          </button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center">
        <div className="w-full h-full" style={{ minHeight: '300px' }}>
          <ResponsivePie
            data={currentData}
            margin={{ top: 5, right: 80, bottom: 5, left: 80 }}
            innerRadius={0.5}
            padAngle={0.7}
            cornerRadius={3}
            activeOuterRadiusOffset={8}
            colors={COLORS}
            borderWidth={1}
            borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsTextColor="#333333"
            arcLinkLabelsThickness={2}
            arcLinkLabelsColor={{ from: 'color' }}
            arcLabelsSkipAngle={10}
            arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
            arcLabel={(d) => {
              if (displayMode === 'percent') {
                const item = currentData.find(c => c.id === d.id);
                return `${item?.percentage.toFixed(0)}%`;
              }
              return `${Math.round(d.value)} zł`;
            }}
            onClick={(node) => {
              if (!selectedBank) {
                handleBankClick(node.id as string);
              }
            }}
            tooltip={({ datum }) => {
              const percentage = ((datum.value / currentTotal) * 100).toFixed(1);
              const formattedValue = (Math.round(datum.value * 100) / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              return (
                <div className="bg-white px-3 py-2 rounded shadow-lg border text-sm">
                  <strong>{datum.label}</strong>
                  <br />
                  {formattedValue} zł
                  <br />
                  <span className="text-gray-500">{percentage}%</span>
                </div>
              );
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
