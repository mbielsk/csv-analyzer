import { useState, useMemo, useRef, useEffect } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import type { CategoryTotal, Transaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BreakdownChartProps {
  categoryTotals: CategoryTotal[];
  transactions: Transaction[];
  onFilterChange: (filter: { type: 'category' | 'bank'; value: string } | null) => void;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#eab308', '#22c55e', '#0ea5e9',
  '#d946ef', '#64748b', '#fb7185', '#4ade80', '#38bdf8'
];

type ChartType = 'spending' | 'funding';
type DisplayMode = 'value' | 'percent';

export function BreakdownChart({ categoryTotals, transactions, onFilterChange }: BreakdownChartProps) {
  const [chartType, setChartType] = useState<ChartType>('spending');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('value');
  const [drillDown, setDrillDown] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Spending data (by category)
  const spendingData = useMemo(() => {
    const total = categoryTotals.reduce((s, d) => s + d.total, 0);
    return categoryTotals.map((d, index) => ({
      id: d.category,
      label: d.category,
      value: Math.round(d.total * 100) / 100,
      percentage: total > 0 ? (d.total / total) * 100 : 0,
      color: COLORS[index % COLORS.length],
    }));
  }, [categoryTotals]);

  // Funding data (by bank)
  const fundingData = useMemo(() => {
    const bankMap = new Map<string, number>();
    for (const t of transactions) {
      const bank = t.bank || 'Unknown';
      bankMap.set(bank, (bankMap.get(bank) || 0) + t.zaIle);
    }
    const total = transactions.reduce((s, t) => s + t.zaIle, 0);
    return Array.from(bankMap.entries())
      .map(([bank, amount], index) => ({
        id: bank,
        label: bank,
        value: Math.round(amount * 100) / 100,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        color: COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  // Drill-down data for spending (sources within category)
  const spendingDrillDown = useMemo(() => {
    if (!drillDown || chartType !== 'spending') return [];
    const filtered = transactions.filter(t => t.rodzaj === drillDown);
    const sourceMap = new Map<string, number>();
    for (const t of filtered) {
      const source = t.skad || 'Nieznane';
      sourceMap.set(source, (sourceMap.get(source) || 0) + t.zaIle);
    }
    const total = filtered.reduce((s, t) => s + t.zaIle, 0);
    return Array.from(sourceMap.entries())
      .map(([source, amount], index) => ({
        id: source,
        label: source,
        value: Math.round(amount * 100) / 100,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        color: COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [drillDown, chartType, transactions]);

  // Drill-down data for funding (categories within bank)
  const fundingDrillDown = useMemo(() => {
    if (!drillDown || chartType !== 'funding') return [];
    const filtered = transactions.filter(t => (t.bank || 'Unknown') === drillDown);
    const categoryMap = new Map<string, number>();
    for (const t of filtered) {
      const category = t.rodzaj || 'Nieznane';
      categoryMap.set(category, (categoryMap.get(category) || 0) + t.zaIle);
    }
    const total = filtered.reduce((s, t) => s + t.zaIle, 0);
    return Array.from(categoryMap.entries())
      .map(([category, amount], index) => ({
        id: category,
        label: category,
        value: Math.round(amount * 100) / 100,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        color: COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [drillDown, chartType, transactions]);

  const currentData = drillDown 
    ? (chartType === 'spending' ? spendingDrillDown : fundingDrillDown)
    : (chartType === 'spending' ? spendingData : fundingData);

  const currentTotal = currentData.reduce((s, d) => s + d.value, 0);

  const handleSliceClick = (id: string) => {
    if (!drillDown) {
      setDrillDown(id);
      onFilterChange({ type: chartType === 'spending' ? 'category' : 'bank', value: id });
    }
  };

  const handleBack = () => {
    setDrillDown(null);
    onFilterChange(null);
  };

  const handleChartSwitch = (type: ChartType) => {
    setChartType(type);
    setDrillDown(null);
    setMenuOpen(false);
    onFilterChange(null);
  };

  const title = chartType === 'spending'
    ? (drillDown ? `${drillDown} by Source` : 'Spending Breakdown')
    : (drillDown ? `${drillDown} by Category` : 'Funding Breakdown');

  if (transactions.length === 0) {
    return (
      <Card className="bg-white h-full">
        <CardHeader>
          <CardTitle className="text-lg">Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-500">No data to display</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="bg-white h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <div className="flex items-center gap-2">
          {drillDown && (
            <button onClick={handleBack} className="p-1 hover:bg-gray-100 rounded">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-md p-0.5">
            <button
              onClick={() => setDisplayMode('value')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                displayMode === 'value' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              zł
            </button>
            <button
              onClick={() => setDisplayMode('percent')}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                displayMode === 'percent' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              %
            </button>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg py-1 z-10 min-w-[160px]">
                <button
                  onClick={() => handleChartSwitch('spending')}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                    chartType === 'spending' ? 'text-blue-600 font-medium' : 'text-gray-700'
                  }`}
                >
                  Spending Breakdown
                </button>
                <button
                  onClick={() => handleChartSwitch('funding')}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                    chartType === 'funding' ? 'text-blue-600 font-medium' : 'text-gray-700'
                  }`}
                >
                  Funding Breakdown
                </button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-2">
        <div style={{ height: '400px' }}>
          <ResponsivePie
            data={currentData}
            margin={{ top: 20, right: 100, bottom: 20, left: 100 }}
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
            onClick={(node) => handleSliceClick(node.id as string)}
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
