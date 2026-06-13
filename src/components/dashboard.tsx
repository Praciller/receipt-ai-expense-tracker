'use client';

import { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useReceipts } from '@/hooks/use-receipts';
import { calculateReceiptStats, type StatsPeriod } from '@/lib/stats';
import { CategoryChart } from './category-chart';
import { ErrorState } from './error-state';
import { LoadingState } from './loading-state';
import { MonthlySpendingChart } from './monthly-spending-chart';
import { ShopSummary } from './shop-summary';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function Dashboard({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
  const { receipts, isLoading, error, refresh } = useReceipts(refreshTrigger);
  const [period, setPeriod] = useState<StatsPeriod>('all');
  const stats = useMemo(
    () => calculateReceiptStats(receipts, period),
    [period, receipts],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">
            Expense dashboard
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Category, shop, and monthly signals from reviewed receipts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Dashboard period">
          {(['all', 'week', 'month', 'year'] as StatsPeriod[]).map((value) => (
            <Button
              key={value}
              type="button"
              variant={period === value ? 'default' : 'outline'}
              size="sm"
              aria-pressed={period === value}
              onClick={() => setPeriod(value)}
            >
              {periodLabel(value)}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Refresh dashboard"
            onClick={() => void refresh()}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading expense dashboard" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void refresh()} />
      ) : (
        <>
          <section
            aria-label="Expense summary"
            className="grid divide-y divide-slate-200 border-y border-slate-200 bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0"
          >
            <Summary label="Total spending" value={formatCurrency(stats.total_spending)} />
            <Summary label="Reviewed receipts" value={String(stats.receipt_count)} />
            <Summary
              label="Average receipt"
              value={formatCurrency(stats.average_receipt_amount)}
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <MonthlySpendingChart data={stats.monthly_spending} />
            <CategoryChart data={stats.spending_by_category} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ShopSummary shops={stats.spending_by_shop} />
            <Card>
              <CardHeader className="border-b border-slate-200">
                <CardTitle>Recent receipts</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {stats.recent_receipts.length ? (
                  <ul className="divide-y divide-slate-100">
                    {stats.recent_receipts.map((receipt) => (
                      <li
                        key={receipt.id}
                        className="flex min-w-0 justify-between gap-4 py-3"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-slate-900">
                            {receipt.shop_name}
                          </span>
                          <span className="mt-1 block text-xs capitalize text-slate-500">
                            {receipt.date} · {receipt.category}
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold text-slate-950">
                          {formatCurrency(receipt.total_amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-12 text-center text-sm text-slate-500">
                    Recent receipts appear after saving.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function periodLabel(period: StatsPeriod) {
  return {
    all: 'All time',
    week: '7 days',
    month: 'This month',
    year: 'This year',
  }[period];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(value);
}
