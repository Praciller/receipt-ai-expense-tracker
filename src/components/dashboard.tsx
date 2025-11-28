'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { format } from 'date-fns';
import {
  TrendingUp,
  Receipt,
  Store,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

interface Stats {
  totalSpending: number;
  receiptCount: number;
  categoryData: Array<{ name: string; value: number }>;
  timeData: Array<{ date: string; amount: number }>;
  recentReceipts: Array<{
    id: string;
    shop_name: string | null;
    total_amount: number | null;
    date: string | null;
    category: string | null;
  }>;
  topShops: Array<{ name: string; amount: number }>;
}

const COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
];

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#10B981',
  Transport: '#3B82F6',
  Shopping: '#F59E0B',
  Utility: '#8B5CF6',
  Healthcare: '#EF4444',
  Entertainment: '#EC4899',
  Other: '#6B7280',
};

interface DashboardProps {
  refreshTrigger?: number;
}

export function Dashboard({ refreshTrigger }: DashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'all'>('all');

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/receipts/stats?period=${period}`);
      const data = await response.json();
      
      // Handle error response or missing data
      if (data.error || !data.categoryData) {
        console.error('API error:', data.error);
        setStats({
          totalSpending: 0,
          receiptCount: 0,
          categoryData: [],
          timeData: [],
          recentReceipts: [],
          topShops: [],
        });
      } else {
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStats({
        totalSpending: 0,
        receiptCount: 0,
        categoryData: [],
        timeData: [],
        recentReceipts: [],
        topShops: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period, refreshTrigger]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center text-gray-500 py-8">
        Unable to load data
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        {(['all', 'week', 'month', 'year'] as const).map((p) => (
          <Button
            key={p}
            variant={period === p ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod(p)}
          >
            {p === 'all' ? 'All Time' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'This Year'}
          </Button>
        ))}
        <Button variant="ghost" size="icon" onClick={fetchStats}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Total Spending
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.totalSpending)}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Total Receipts
            </CardTitle>
            <Receipt className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.receiptCount}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Average per Receipt
            </CardTitle>
            <Store className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(
                stats.receiptCount > 0
                  ? stats.totalSpending / stats.receiptCount
                  : 0
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Over Time */}
        <Card className="shadow-sm">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Calendar className="h-5 w-5 text-blue-600" />
              Spending Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.timeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.timeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return format(date, 'd MMM');
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `฿${value.toLocaleString()}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Spending']}
                    labelFormatter={(label) => {
                      const date = new Date(label);
                      return format(date, 'd MMMM yyyy');
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="shadow-sm">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-gray-800">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {stats.categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CATEGORY_COLORS[entry.name] || COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Shops & Recent Receipts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Shops */}
        <Card className="shadow-sm">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Store className="h-5 w-5 text-blue-600" />
              Top Stores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topShops.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.topShops} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `฿${value.toLocaleString()}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Spending']}
                  />
                  <Bar dataKey="amount" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Receipts */}
        <Card className="shadow-sm">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Receipt className="h-5 w-5 text-blue-600" />
              Recent Receipts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentReceipts.length > 0 ? (
              <div className="space-y-3">
                {stats.recentReceipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {receipt.shop_name || 'Unknown Store'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {receipt.date
                          ? format(new Date(receipt.date), 'd MMM yyyy')
                          : 'No date'}
                        {receipt.category && (
                          <span
                            className="ml-2 px-2 py-0.5 text-xs rounded-full"
                            style={{
                              backgroundColor: `${CATEGORY_COLORS[receipt.category] || '#6B7280'}20`,
                              color: CATEGORY_COLORS[receipt.category] || '#6B7280',
                            }}
                          >
                            {receipt.category}
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(receipt.total_amount || 0)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-400">
                No receipts yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
