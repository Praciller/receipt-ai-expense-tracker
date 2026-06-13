import { describe, expect, it } from 'vitest';
import { calculateReceiptStats } from './stats';
import type { ReceiptRecord } from './receipt';

const receipts: ReceiptRecord[] = [
  {
    id: '1',
    shop_name: 'Cafe A',
    date: '2025-05-01',
    items: [],
    total_amount: 100,
    tax_id: null,
    category: 'food',
    currency: 'THB',
    confidence: 0.9,
    notes: '',
    parse_status: 'parsed',
    created_at: '2025-05-01T08:00:00.000Z',
  },
  {
    id: '2',
    shop_name: 'Cafe A',
    date: '2025-05-02',
    items: [],
    total_amount: 200,
    tax_id: null,
    category: 'food',
    currency: 'THB',
    confidence: 0.8,
    notes: '',
    parse_status: 'parsed',
    created_at: '2025-05-02T08:00:00.000Z',
  },
];

describe('calculateReceiptStats', () => {
  it('returns the required aggregate contract', () => {
    const stats = calculateReceiptStats(receipts, 'all', new Date('2025-06-01T00:00:00.000Z'));

    expect(stats.total_spending).toBe(300);
    expect(stats.receipt_count).toBe(2);
    expect(stats.average_receipt_amount).toBe(150);
    expect(stats.spending_by_category).toEqual([{ name: 'food', value: 300 }]);
    expect(stats.spending_by_shop).toEqual([{ name: 'Cafe A', amount: 300 }]);
    expect(stats.monthly_spending).toEqual([{ date: '2025-05', amount: 300 }]);
    expect(stats.recent_receipts).toHaveLength(2);
  });
});
