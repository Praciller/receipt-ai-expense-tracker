import {
  areMoneyAmountsWithinRoundingTolerance,
  validateAndNormalizeReceipt,
} from './receipt.ts';

export interface EvaluationCase {
  id: string;
  description?: string;
  input: Record<string, unknown>;
  expected: {
    success: boolean;
    date?: string;
    warning_count?: number;
    reconciliation_status?: string;
    item_mismatch_count?: number;
  };
}

export interface EvaluationMetric {
  numerator: number;
  denominator: number;
  rate: number;
}

export interface EvaluationOutcome {
  id: string;
  expected_success: boolean;
  schema_valid: boolean;
  exact_match: number;
  numeric_tolerance_match: number;
  item_count_match: number;
  completeness: number;
  warning_match: number;
  reconciliation_status_match: number;
  item_mismatch_match: number;
  source_evidence_present: number;
}

export interface ExtractionEvaluation {
  generated_from: 'synthetic fixtures only';
  metrics: {
    fixture_count: number;
    schema_valid_response_rate: EvaluationMetric;
    fixture_expectation_match_rate: EvaluationMetric;
    invalid_case_rejection_rate: EvaluationMetric;
    exact_match: EvaluationMetric;
    numeric_tolerance_match: EvaluationMetric;
    item_count_accuracy: EvaluationMetric;
    field_level_completeness: EvaluationMetric;
    validation_warning_accuracy: EvaluationMetric;
    reconciliation_status_accuracy: EvaluationMetric;
    item_mismatch_accuracy: EvaluationMetric;
    source_evidence_coverage: EvaluationMetric;
  };
  cases: EvaluationOutcome[];
}

export function evaluateExtractionCases(cases: EvaluationCase[]): ExtractionEvaluation {
  assertUniqueCaseIds(cases);
  const outcomes = cases.map(evaluateCase);
  const expectedValid = outcomes.filter((outcome) => outcome.expected_success);
  const valid = expectedValid.filter((outcome) => outcome.schema_valid);
  const expectedInvalid = outcomes.filter((outcome) => !outcome.expected_success);
  const casesById = new Map(cases.map((testCase) => [testCase.id, testCase]));
  const statusChecked = valid.filter(
    (outcome) => casesById.get(outcome.id)?.expected.reconciliation_status !== undefined,
  );
  const mismatchChecked = valid.filter(
    (outcome) => casesById.get(outcome.id)?.expected.item_mismatch_count !== undefined,
  );
  const expectedFieldCount = valid.length * 10;
  const presentFieldCount = valid.reduce(
    (sum, outcome) => sum + outcome.completeness * 10,
    0,
  );

  return {
    generated_from: 'synthetic fixtures only',
    metrics: {
      fixture_count: cases.length,
      schema_valid_response_rate: metric(valid.length, expectedValid.length),
      fixture_expectation_match_rate: metric(
        outcomes.filter((outcome) => outcome.expected_success === outcome.schema_valid).length,
        outcomes.length,
      ),
      invalid_case_rejection_rate: metric(
        expectedInvalid.filter((outcome) => !outcome.schema_valid).length,
        expectedInvalid.length,
      ),
      exact_match: aggregate(valid, (outcome) => outcome.exact_match, 4),
      numeric_tolerance_match: aggregateNumericMatches(valid, cases),
      item_count_accuracy: metric(valid.filter((outcome) => outcome.item_count_match === 1).length, valid.length),
      field_level_completeness: metric(presentFieldCount, expectedFieldCount),
      validation_warning_accuracy: metric(
        valid.filter((outcome) => outcome.warning_match === 1).length,
        valid.length,
      ),
      reconciliation_status_accuracy: metric(
        statusChecked.filter((outcome) => outcome.reconciliation_status_match === 1).length,
        statusChecked.length,
      ),
      item_mismatch_accuracy: metric(
        mismatchChecked.filter((outcome) => outcome.item_mismatch_match === 1).length,
        mismatchChecked.length,
      ),
      source_evidence_coverage: metric(
        valid.filter((outcome) => outcome.source_evidence_present === 1).length,
        valid.length,
      ),
    },
    cases: outcomes,
  };
}

export function formatMetric(value: EvaluationMetric) {
  return `${value.numerator}/${value.denominator} (${(value.rate * 100).toFixed(1)}%)`;
}

function evaluateCase(testCase: EvaluationCase): EvaluationOutcome {
  const result = validateAndNormalizeReceipt(testCase.input);
  if (!result.success) {
    return {
      id: testCase.id,
      expected_success: testCase.expected.success,
      schema_valid: false,
      exact_match: 0,
      numeric_tolerance_match: 0,
      item_count_match: 0,
      completeness: 0,
      warning_match: Number(!testCase.expected.success),
      reconciliation_status_match: Number(!testCase.expected.reconciliation_status),
      item_mismatch_match: Number(testCase.expected.item_mismatch_count === undefined),
      source_evidence_present: 0,
    };
  }

  const receipt = result.data;
  const expectedCategory = testCase.input.category === 'restaurant' ? 'food' : testCase.input.category;
  const exactMatches = [
    receipt.shop_name === testCase.input.shop_name,
    receipt.date === testCase.expected.date,
    receipt.currency === testCase.input.currency,
    receipt.category === expectedCategory,
  ];
  const numericFields = ['total_amount', 'subtotal', 'tax_amount', 'discount', 'service_charge'];
  const numericExpected = numericFields.filter((field) => typeof testCase.input[field] === 'number');
  const numericMatches = numericExpected.filter((field) =>
    areMoneyAmountsWithinRoundingTolerance(
      receipt[field as keyof typeof receipt] as number,
      testCase.input[field] as number,
    ),
  ).length;
  const presentFields = [
    receipt.shop_name,
    receipt.date,
    receipt.currency,
    receipt.category,
    receipt.confidence,
    receipt.warnings,
    receipt.evidence,
    receipt.reconciliation_status,
    receipt.reconciliation_warnings,
    receipt.parse_status,
  ].filter((field) => field !== undefined && field !== null).length;

  return {
    id: testCase.id,
    expected_success: testCase.expected.success,
    schema_valid: true,
    exact_match: ratio(exactMatches.filter(Boolean).length, exactMatches.length),
    numeric_tolerance_match: ratio(numericMatches, numericExpected.length),
    item_count_match: Number(receipt.items.length === (Array.isArray(testCase.input.items) ? testCase.input.items.length : 0)),
    completeness: ratio(presentFields, 10),
    warning_match: Number(receipt.warnings.length === (testCase.expected.warning_count ?? 0)),
    reconciliation_status_match: Number(
      testCase.expected.reconciliation_status === undefined ||
        receipt.reconciliation_status === testCase.expected.reconciliation_status,
    ),
    item_mismatch_match: Number(
      testCase.expected.item_mismatch_count === undefined ||
        receipt.item_mismatch_count === testCase.expected.item_mismatch_count,
    ),
    source_evidence_present: Number(receipt.evidence.length > 0),
  };
}

function assertUniqueCaseIds(cases: EvaluationCase[]) {
  const seen = new Set<string>();
  for (const testCase of cases) {
    const id = testCase.id.trim();
    if (!id) {
      throw new Error('Evaluation fixture ids must be non-empty.');
    }
    if (seen.has(id)) {
      throw new Error(`Evaluation fixture ids must be unique; duplicate id: ${id}`);
    }
    seen.add(id);
  }
}

function aggregate(items: EvaluationOutcome[], select: (item: EvaluationOutcome) => number, fieldsPerItem: number) {
  return metric(
    items.reduce((sum, item) => sum + select(item) * fieldsPerItem, 0),
    items.length * fieldsPerItem,
  );
}

function aggregateNumericMatches(items: EvaluationOutcome[], cases: EvaluationCase[]) {
  const byId = new Map(cases.map((testCase) => [testCase.id, testCase]));
  let matched = 0;
  let compared = 0;
  for (const outcome of items) {
    const testCase = byId.get(outcome.id);
    const fields = ['total_amount', 'subtotal', 'tax_amount', 'discount', 'service_charge'];
    const expected = fields.filter((field) => typeof testCase?.input[field] === 'number');
    compared += expected.length;
    matched += outcome.numeric_tolerance_match * expected.length;
  }
  return metric(matched, compared);
}

function metric(numerator: number, denominator: number): EvaluationMetric {
  return {
    numerator,
    denominator,
    rate: denominator ? Number((numerator / denominator).toFixed(4)) : 0,
  };
}

function ratio(numerator: number, denominator: number) {
  return denominator ? numerator / denominator : 0;
}
