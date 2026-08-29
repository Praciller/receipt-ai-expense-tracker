import { describe, expect, it } from 'vitest';
import {
  normalizeCategory,
  normalizeReceiptDate,
  validateAndNormalizeReceipt,
} from './receipt';

describe('normalizeReceiptDate', () => {
  it('converts a full Buddhist Era year to Gregorian', () => {
    expect(normalizeReceiptDate('27/11/2568')).toBe('2025-11-27');
  });

  it('converts a cautious short Thai Buddhist Era year', () => {
    expect(normalizeReceiptDate('27/11/68')).toBe('2025-11-27');
  });

  it('rejects impossible dates', () => {
    expect(normalizeReceiptDate('31/02/2568')).toBeNull();
  });
});

describe('normalizeCategory', () => {
  it('maps English and Thai category aliases to the allowed values', () => {
    expect(normalizeCategory('Healthcare')).toBe('health');
    expect(normalizeCategory('อาหารและเครื่องดื่ม')).toBe('food');
    expect(normalizeCategory('unknown category')).toBe('other');
  });
});

describe('validateAndNormalizeReceipt', () => {
  it('accepts an empty item list when shop and total are present', () => {
    const result = validateAndNormalizeReceipt({
      shop_name: 'ร้านทดสอบ',
      date: '27/11/2568',
      items: [],
      total_amount: 125.5,
      tax_id: null,
      category: 'Food',
      currency: 'THB',
      confidence: 0.88,
      notes: '',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.date).toBe('2025-11-27');
      expect(result.data.category).toBe('food');
      expect(result.data.reconciliation_status).toBe('insufficient_evidence');
      expect(result.data.reconciliation_warnings).toEqual([
        'Unable to reconcile because no line items were extracted.',
      ]);
      expect(result.data.parse_status).toBe('review_required');
    }
  });

  it('reconciles exact line items and the receipt total', () => {
    const result = validateAndNormalizeReceipt({
      shop_name: 'Exact Shop',
      date: '2025-01-01',
      items: [
        { name: 'Coffee', quantity: 1, unit_price: 85, total_price: 85 },
        { name: 'Bread', quantity: 1, unit_price: 45, total_price: 45 },
      ],
      total_amount: 130,
      category: 'food',
      currency: 'THB',
      confidence: 0.9,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reconciliation_status).toBe('reconciled');
      expect(result.data.item_mismatch_count).toBe(0);
      expect(result.data.item_total_delta).toBe(0);
      expect(result.data.receipt_total_delta).toBe(0);
      expect(result.data.reconciliation_warnings).toEqual([]);
      expect(result.data.item_reconciliation).toEqual([
        {
          item_index: 0,
          expected_total: 85,
          extracted_total: 85,
          delta: 0,
          matched: true,
        },
        {
          item_index: 1,
          expected_total: 45,
          extracted_total: 45,
          delta: 0,
          matched: true,
        },
      ]);
    }
  });

  it('uses quantity in exact decimal line-item arithmetic', () => {
    const result = validateAndNormalizeReceipt({
      shop_name: 'Quantity Shop',
      date: '2025-01-01',
      items: [{ name: 'Snack', quantity: 2, unit_price: 10.25, total_price: 20.5 }],
      total_amount: 20.5,
      category: 'shopping',
      currency: 'THB',
      confidence: 0.9,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reconciliation_status).toBe('reconciled');
      expect(result.data.item_reconciliation[0]).toEqual({
        item_index: 0,
        expected_total: 20.5,
        extracted_total: 20.5,
        delta: 0,
        matched: true,
      });
    }
  });

  it('keeps satang-level values exact instead of comparing binary floats', () => {
    const result = validateAndNormalizeReceipt({
      shop_name: 'Satang Shop',
      date: '2025-01-01',
      items: [{ name: 'Item', quantity: 3, unit_price: 0.1, total_price: 0.3 }],
      total_amount: 0.3,
      category: 'other',
      currency: 'THB',
      confidence: 0.9,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reconciliation_status).toBe('reconciled');
      expect(result.data.item_total_delta).toBe(0);
      expect(result.data.receipt_total_delta).toBe(0);
    }
  });

  it('reports a line-item arithmetic mismatch without correcting the extracted total', () => {
    const result = validateAndNormalizeReceipt({
      shop_name: 'Item Mismatch Shop',
      date: '2025-01-01',
      items: [{ name: 'Item', quantity: 2, unit_price: 10, total_price: 18 }],
      total_amount: 18,
      category: 'shopping',
      currency: 'THB',
      confidence: 0.9,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0]?.total_price).toBe(18);
      expect(result.data.reconciliation_status).toBe('review_required');
      expect(result.data.item_mismatch_count).toBe(1);
      expect(result.data.item_total_delta).toBe(-2);
      expect(result.data.receipt_total_delta).toBe(0);
      expect(result.data.reconciliation_warnings).toEqual([
        '1 line item does not match quantity × unit price.',
      ]);
      expect(result.data.warnings).toEqual(result.data.reconciliation_warnings);
    }
  });

  it('reports a receipt total mismatch as review evidence', () => {
    const result = validateAndNormalizeReceipt({
      shop_name: 'Fee Shop',
      date: '2025-01-01',
      items: [{ name: 'Meal', quantity: 1, unit_price: 100, total_price: 100 }],
      total_amount: 112,
      category: 'food',
      currency: 'THB',
      confidence: 0.9,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reconciliation_status).toBe('review_required');
      expect(result.data.item_mismatch_count).toBe(0);
      expect(result.data.item_total_delta).toBe(0);
      expect(result.data.receipt_total_delta).toBe(-12);
      expect(result.data.reconciliation_warnings).toEqual([
        'Line-item sum differs from receipt total by ฿12.00.',
      ]);
    }
  });

  it('reports multiple mismatches even when their aggregate delta cancels out', () => {
    const result = validateAndNormalizeReceipt({
      shop_name: 'Multiple Mismatch Shop',
      date: '2025-01-01',
      items: [
        { name: 'First', quantity: 1, unit_price: 10, total_price: 11 },
        { name: 'Second', quantity: 2, unit_price: 10, total_price: 19 },
      ],
      total_amount: 30,
      category: 'shopping',
      currency: 'THB',
      confidence: 0.9,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.item_mismatch_count).toBe(2);
      expect(result.data.item_total_delta).toBe(0);
      expect(result.data.reconciliation_status).toBe('review_required');
      expect(result.data.item_reconciliation.map((item) => item.delta)).toEqual([
        1,
        -1,
      ]);
      expect(result.data.reconciliation_warnings).toEqual([
        '2 line items do not match quantity × unit price.',
      ]);
    }
  });

  it('allows an explicitly documented one-satang rounding tolerance', () => {
    const result = validateAndNormalizeReceipt({
      shop_name: 'Rounding Shop',
      date: '2025-01-01',
      items: [{ name: 'Rounded item', quantity: 3, unit_price: 0.335, total_price: 1.01 }],
      total_amount: 1.01,
      category: 'other',
      currency: 'THB',
      confidence: 0.9,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reconciliation_status).toBe('reconciled');
      expect(result.data.item_mismatch_count).toBe(0);
      expect(result.data.item_reconciliation[0]?.delta).toBe(0.005);
      expect(result.data.reconciliation_warnings).toEqual([]);
    }
  });

  it('reconciles large but bounded monetary values', () => {
    const result = validateAndNormalizeReceipt({
      shop_name: 'Large Amount Shop',
      date: '2025-01-01',
      items: [
        {
          name: 'Equipment',
          quantity: 1,
          unit_price: 9999999999.99,
          total_price: 9999999999.99,
        },
      ],
      total_amount: 9999999999.99,
      category: 'office',
      currency: 'THB',
      confidence: 0.9,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reconciliation_status).toBe('reconciled');
      expect(result.data.item_total_delta).toBe(0);
      expect(result.data.receipt_total_delta).toBe(0);
    }
  });

  it('rejects negative totals', () => {
    const result = validateAndNormalizeReceipt({
      shop_name: 'Test',
      date: '2025-01-01',
      items: [],
      total_amount: -1,
      category: 'other',
      currency: 'THB',
      confidence: 0.5,
      notes: '',
    });

    expect(result.success).toBe(false);
  });

  it('rejects negative or incomplete item amounts instead of dropping or correcting them', () => {
    const negative = validateAndNormalizeReceipt({
      shop_name: 'Invalid Item Shop',
      date: '2025-01-01',
      items: [{ name: 'Invalid', quantity: 1, unit_price: -1, total_price: -1 }],
      total_amount: 0,
      category: 'other',
      currency: 'THB',
      confidence: 0.9,
    });
    const incomplete = validateAndNormalizeReceipt({
      shop_name: 'Incomplete Item Shop',
      date: '2025-01-01',
      items: [{ name: 'Incomplete', quantity: 1, unit_price: 10 }],
      total_amount: 10,
      category: 'other',
      currency: 'THB',
      confidence: 0.9,
    });

    expect(negative.success).toBe(false);
    expect(incomplete.success).toBe(false);
  });

  it('preserves raw Buddhist Era dates and financial evidence', () => {
    const result = validateAndNormalizeReceipt({
      shop_name: 'Synthetic Restaurant',
      date: '13/06/2568',
      raw_date_text: '13/06/2568',
      items: [{ name: 'Meal', quantity: 1, unit_price: 100, total_price: 100 }],
      subtotal: 100,
      tax_amount: 7,
      discount: 0,
      service_charge: 10,
      total_amount: 117,
      category: 'restaurant',
      currency: 'THB',
      confidence: 0.9,
      warnings: [],
      evidence: [{ field: 'total_amount', text: 'TOTAL 117.00' }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.date_normalization).toEqual({
        calendar: 'buddhist_era',
        original_year: 2568,
        converted: true,
      });
      expect(result.data.service_charge).toBe(10);
      expect(result.data.evidence[0]?.field).toBe('total_amount');
    }
  });

  it('adds warnings for suspicious line-item and grand-total mismatches', () => {
    const result = validateAndNormalizeReceipt({
      shop_name: 'Mismatch Shop',
      date: '2025-01-01',
      items: [{ name: 'Item', quantity: 1, unit_price: 40, total_price: 40 }],
      subtotal: 50,
      tax_amount: 0,
      discount: 0,
      service_charge: 0,
      total_amount: 60,
      category: 'shopping',
      currency: 'USD',
      confidence: 0.8,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe('USD');
      expect(result.data.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Line-item sum'),
          expect.stringContaining('financial breakdown'),
        ]),
      );
      expect(result.data.parse_status).toBe('review_required');
    }
  });

  it('rejects unsupported currencies instead of silently coercing them', () => {
    const result = validateAndNormalizeReceipt({
      shop_name: 'Unsupported Currency Shop',
      date: '2025-01-01',
      items: [],
      total_amount: 10,
      category: 'other',
      currency: 'BTC',
      confidence: 0.9,
    });

    expect(result.success).toBe(false);
  });

  it('rejects confidence outside the contract range', () => {
    const result = validateAndNormalizeReceipt({
      shop_name: 'Confidence Test',
      date: '2025-01-01',
      items: [],
      total_amount: 10,
      category: 'other',
      currency: 'THB',
      confidence: 1.2,
    });

    expect(result.success).toBe(false);
  });
});
