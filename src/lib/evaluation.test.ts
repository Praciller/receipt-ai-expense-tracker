import { describe, expect, it } from 'vitest';
import { evaluateExtractionCases } from './evaluation';

const validCase = {
  id: 'thai-receipt',
  description: 'Fictional Thai receipt with a printed total.',
  input: {
    shop_name: 'ร้านตัวอย่าง',
    date: '13/06/2568',
    items: [{ name: 'น้ำดื่ม', quantity: 2, unit_price: 10, total_price: 20 }],
    subtotal: 20,
    tax_amount: 0,
    discount: 0,
    service_charge: 0,
    total_amount: 20,
    category: 'shopping',
    currency: 'THB',
    confidence: 0.9,
    evidence: [{ field: 'total_amount', text: 'รวม 20.00 บาท' }],
  },
  expected: {
    success: true,
    date: '2025-06-13',
    warning_count: 0,
    reconciliation_status: 'reconciled',
    item_mismatch_count: 0,
  },
};

describe('synthetic extraction evaluation', () => {
  it('rejects duplicate fixture ids before producing misleading aggregates', () => {
    expect(() => evaluateExtractionCases([validCase, { ...validCase }])).toThrow(
      'Evaluation fixture ids must be unique; duplicate id: thai-receipt',
    );
  });

  it('reports metric numerators and denominators from eligible synthetic evidence', () => {
    const result = evaluateExtractionCases([validCase]);

    expect(result.metrics.fixture_count).toBe(1);
    expect(result.metrics.schema_valid_response_rate).toEqual({ numerator: 1, denominator: 1, rate: 1 });
    expect(result.metrics.fixture_expectation_match_rate).toEqual({ numerator: 1, denominator: 1, rate: 1 });
    expect(result.metrics.exact_match).toEqual({ numerator: 4, denominator: 4, rate: 1 });
    expect(result.metrics.numeric_tolerance_match).toEqual({ numerator: 5, denominator: 5, rate: 1 });
    expect(result.metrics.source_evidence_coverage).toEqual({ numerator: 1, denominator: 1, rate: 1 });
  });

  it('reports zero when a metric has no eligible cases', () => {
    const result = evaluateExtractionCases([]);

    expect(result.metrics.schema_valid_response_rate).toEqual({ numerator: 0, denominator: 0, rate: 0 });
    expect(result.metrics.fixture_expectation_match_rate).toEqual({ numerator: 0, denominator: 0, rate: 0 });
    expect(result.metrics.invalid_case_rejection_rate).toEqual({ numerator: 0, denominator: 0, rate: 0 });
  });
});
