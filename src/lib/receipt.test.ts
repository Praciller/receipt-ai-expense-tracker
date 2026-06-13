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
      expect(result.data.parse_status).toBe('parsed');
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
});
