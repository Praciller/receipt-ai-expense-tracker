'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function MonthlySpendingChart({
  data,
}: {
  data: Array<{ date: string; amount: number }>;
}) {
  return (
    <Card>
      <CardHeader className="border-b border-slate-200">
        <CardTitle>Monthly spending</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {data.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `฿${Number(value).toLocaleString()}`}
              />
              <Tooltip
                formatter={(value) => [
                  formatCurrency(Number(value)),
                  'Spending',
                ]}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ fill: '#2563eb', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">
            Monthly totals appear after the first saved receipt.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(value);
}
