import type { ReceiptRecord } from './receipt';

export type StatsPeriod = 'week' | 'month' | 'year' | 'all';

export function calculateReceiptStats(
  receipts: ReceiptRecord[],
  period: StatsPeriod,
  now = new Date(),
) {
  const startDate = getStartDate(period, now);
  const filtered = receipts.filter((receipt) => {
    if (!startDate) {
      return true;
    }

    const date = new Date(`${receipt.date}T00:00:00.000Z`);
    return date >= startDate && date <= now;
  });
  const totalSpending = filtered.reduce(
    (sum, receipt) => sum + receipt.total_amount,
    0,
  );

  return {
    total_spending: totalSpending,
    receipt_count: filtered.length,
    average_receipt_amount: filtered.length ? totalSpending / filtered.length : 0,
    spending_by_category: aggregate(
      filtered,
      (receipt) => receipt.category,
      'value',
    ),
    spending_by_shop: aggregate(
      filtered,
      (receipt) => receipt.shop_name,
      'amount',
    ),
    monthly_spending: aggregate(
      filtered,
      (receipt) => receipt.date.slice(0, 7),
      'amount',
      true,
    ).map(({ name, amount }) => ({ date: name, amount })),
    recent_receipts: [...filtered]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 5),
  };
}

function getStartDate(period: StatsPeriod, now: Date) {
  switch (period) {
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    case 'year':
      return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    default:
      return null;
  }
}

function aggregate(
  receipts: ReceiptRecord[],
  keyFor: (receipt: ReceiptRecord) => string,
  valueKey: 'value' | 'amount',
  ascending = false,
) {
  const totals = new Map<string, number>();
  for (const receipt of receipts) {
    const key = keyFor(receipt);
    totals.set(key, (totals.get(key) ?? 0) + receipt.total_amount);
  }

  return [...totals.entries()]
    .map(([name, value]) => ({ name, [valueKey]: value }))
    .sort((a, b) =>
      ascending
        ? a.name.localeCompare(b.name)
        : Number(b[valueKey]) - Number(a[valueKey]),
    ) as Array<{ name: string; value: number } & { amount: number }>;
}
