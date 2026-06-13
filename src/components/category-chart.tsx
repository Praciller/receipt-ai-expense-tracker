'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#475569'];

export function CategoryChart({
  data,
}: {
  data: Array<{ name: string; value: number }>;
}) {
  return (
    <Card>
      <CardHeader className="border-b border-slate-200">
        <CardTitle>Spending by category</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {data.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={65}
                outerRadius={105}
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
        {data.length > 0 && (
          <ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
            {data.map((entry, index) => (
              <li key={entry.name} className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="truncate capitalize text-slate-600">
                  {entry.name}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">
      Save a receipt to build this breakdown.
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(value);
}
