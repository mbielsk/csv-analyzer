import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { CategoryTotal } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CategoryBarChartProps {
  data: CategoryTotal[];
  limit?: number;
}

export function CategoryBarChart({ data, limit = 5 }: CategoryBarChartProps) {
  const chartData = data.slice(0, limit);

  if (chartData.length === 0) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Top Categories</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-500">No data to display</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-lg">Top {limit} Categories</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" tickFormatter={(v) => `${v.toLocaleString('pl-PL')} zł`} />
            <YAxis type="category" dataKey="category" width={100} />
            <Tooltip
              formatter={(value) => (typeof value === 'number' ? value.toLocaleString('pl-PL', { minimumFractionDigits: 2 }) + ' zł' : value)}
            />
            <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
