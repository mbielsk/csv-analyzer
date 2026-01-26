import { useState, useMemo } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { ArrowLeft } from 'lucide-react';
import type { CategoryTotal, Transaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SpendingPieChartProps {
  data: CategoryTotal[];
  transactions: Transaction[];
  onSliceClick: (category: string) => void;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#eab308', '#22c55e', '#0ea5e9',
  '#d946ef', '#64748b', '#fb7185', '#4ade80', '#38bdf8'
];

type DisplayMode = 'value' | 'percent';

export function SpendingPieChart({ data, transactions, onSliceClick }: SpendingPieChartProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('value');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const total = data.reduce((s, d) => s + d.total, 0);
  
  // Calculate source breakdown for selected category
  const sourceBreakdown = useMemo(() => {
    if (!selectedCategory) return [];
    
    const categoryTransactions = transactions.filter(t => t.rodzaj === selectedCategory);
    const sourceMap = new Map<string, number>();
    
    for (const t of categoryTransactions) {
      const source = t.skad || 'Nieznane';
      sourceMap.set(source, (sourceMap.get(source) || 0) + t.zaIle);
    }
    
    const categoryTotal = categoryTransactions.reduce((s, t) => s + t.zaIle, 0);
    
    return Array.from(sourceMap.entries())
      .map(([source, amount], index) => ({
        id: source,
        label: source,
        value: Math.round(amount * 100) / 100,
        percentage: categoryTotal > 0 ? (amount / categoryTotal) * 100 : 0,
        color: COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [selectedCategory, transactions]);
  
  const chartData = data.map((d, index) => ({
    id: d.category,
    label: d.category,
    value: Math.round(d.total * 100) / 100,
    percentage: total > 0 ? (d.total / total) * 100 : 0,
    color: COLORS[index % COLORS.length],
  }));

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    onSliceClick(category);
  };

  const handleBack = () => {
    setSelectedCategory(null);
    onSliceClick(''); // Clear filter
  };

  if (data.length === 0) {
    return (
      <Card className="bg-white h-full">
        <CardHeader>
          <CardTitle className="text-lg">Spending Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-500">No data to display</p>
        </CardContent>
      </Card>
    );
  }

  const currentData = selectedCategory ? sourceBreakdown : chartData;
  const currentTotal = selectedCategory 
    ? sourceBreakdown.reduce((s, d) => s + d.value, 0)
    : total;

  return (
    <Card className="bg-white h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedCategory && (
            <button
              onClick={handleBack}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <CardTitle className="text-lg">
            {selectedCategory ? `${selectedCategory} by Source` : 'Spending Breakdown'}
          </CardTitle>
        </div>
        <div className="flex bg-gray-100 rounded-md p-0.5">
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
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height: 300 }}>
          <ResponsivePie
            data={currentData}
            margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
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
              if (!selectedCategory) {
                handleCategoryClick(node.id as string);
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
        {selectedCategory && (
          <p className="text-xs text-center text-gray-500 mt-2">
            Click ← to go back to categories
          </p>
        )}
      </CardContent>
    </Card>
  );
}
